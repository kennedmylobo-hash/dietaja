import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('[asaas-webhook] Received:', JSON.stringify(body));

    const { event, payment } = body;

    if (!payment) {
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const orderId = payment.externalReference;
    const asaasPaymentId = payment.id;

    console.log('[asaas-webhook] Event:', event, 'Order:', orderId, 'Payment:', asaasPaymentId);

    if (!orderId) {
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let orderStatus = 'pending';
    
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      orderStatus = 'approved';
    } else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED') {
      orderStatus = 'rejected';
    } else if (event === 'PAYMENT_REFUNDED') {
      orderStatus = 'refunded';
    } else {
      console.log('[asaas-webhook] Non-actionable event:', event);
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('status, stock_decremented, customer_email, customer_phone, order_number, tenant_id')
      .eq('id', orderId)
      .maybeSingle();

    if (checkError) console.error('[asaas-webhook] Error checking existing order:', checkError);

    if (existingOrder?.status === 'approved') {
      console.log('[asaas-webhook] Order already approved, skipping:', orderId);
      return new Response(JSON.stringify({ received: true, message: 'Order already processed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const updateData: Record<string, unknown> = {
      status: orderStatus,
      mp_payment_id: asaasPaymentId,
      payment_method: 'pix',
    };

    if (orderStatus === 'approved') updateData.paid_at = new Date().toISOString();

    const { error: updateError } = await supabase.from('orders').update(updateData).eq('id', orderId);

    if (updateError) {
      console.error('[asaas-webhook] Error updating order:', updateError);
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[asaas-webhook] Order updated successfully:', orderId, orderStatus);

    if (orderStatus === 'approved' && existingOrder) {
      const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();

      if (orderError) {
        console.error('[asaas-webhook] Error fetching order:', orderError);
      } else if (order) {
        // Cancel orphan orders
        const { data: cancelledOrders, error: cancelError } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancellation_type: 'auto_orphan' })
          .eq('customer_email', order.customer_email)
          .in('status', ['pending', 'awaiting_payment'])
          .neq('id', orderId)
          .select('id, order_number');

        if (!cancelError && cancelledOrders?.length) {
          for (const cancelled of cancelledOrders) {
            await supabase.from('order_status_history').insert({
              order_id: cancelled.id,
              previous_status: 'pending',
              new_status: 'cancelled',
              changed_by_name: 'Sistema',
              notes: `Cancelado automaticamente - Pedido #${order.order_number} foi pago`,
              tenant_id: order.tenant_id || '00000000-0000-0000-0000-000000000001',
            });
          }
        }

        // Mark cart as converted
        if (order.customer_phone) {
          const normalizedPhone = order.customer_phone.replace(/\D/g, '');
          const phoneSuffix = normalizedPhone.slice(-10);
          await supabase.from('carts').update({ status: 'converted' })
            .ilike('phone', `%${phoneSuffix}`).in('status', ['active', 'abandoned']);
        }

        // Send approval email (tenant_id is passed through)
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-order-approved`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              order_number: order.order_number,
              customer_email: order.customer_email,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              items: order.items,
              subtotal: order.subtotal,
              delivery_fee: order.delivery_fee || 0,
              total: order.total,
              delivery_option: order.delivery_option,
              delivery_address: order.delivery_address,
              payment_method: 'pix',
              tenant_id: order.tenant_id,
            }),
          });
        } catch (emailError) {
          console.error('[asaas-webhook] Error sending email:', emailError);
        }

        // Decrement stock
        if (!order.stock_decremented) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/decrement-stock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
              body: JSON.stringify({ order_id: orderId }),
            });
          } catch (stockError) {
            console.error('[asaas-webhook] Error decrementing stock:', stockError);
          }
        }

        // NOTE: WhatsApp confirmation to customer is already sent by send-order-approved above
        // Do NOT call send-order-whatsapp here to avoid duplicate messages

        // Process cashback
        try {
          await fetch(`${supabaseUrl}/functions/v1/process-cashback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ action: 'credit', order_id: orderId, customer_email: order.customer_email, order_total: order.total }),
          });
        } catch (cashbackError) {
          console.error('[asaas-webhook] Error processing cashback:', cashbackError);
        }

        // Fire server-side Purchase event to Meta CAPI (backup for browser pixel)
        try {
          await fetch(`${supabaseUrl}/functions/v1/meta-capi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              event_name: 'Purchase',
              event_id: `purchase_${orderId}`,
              value: order.total,
              currency: 'BRL',
              customer_email: order.customer_email,
              customer_phone: order.customer_phone,
              source_url: `https://diet-on-demand.lovable.app/pagamento-sucesso?order_id=${orderId}`,
              tenant_id: order.tenant_id,
              custom_data: {
                order_id: orderId,
                payment_method: 'pix',
              },
            }),
          });
          console.log('[asaas-webhook] ✅ Meta CAPI Purchase event sent for order', order.order_number);
        } catch (capiError) {
          console.error('[asaas-webhook] Error sending Meta CAPI:', capiError);
        }

        // Send WhatsApp alert to admin
        try {
          const { getWhatsAppCredentials } = await import("../_shared/tenant-credentials.ts");
          const { sendWhatsAppText } = await import("../_shared/evolution-sender.ts");
          
          const tenantId = order.tenant_id || '00000000-0000-0000-0000-000000000001';
          const { data: tenant } = await supabase.from('tenants').select('admin_notify_phone, whatsapp').eq('id', tenantId).maybeSingle();
          const adminPhone = tenant?.admin_notify_phone || tenant?.whatsapp;
          
          if (adminPhone) {
            const whatsappCreds = await getWhatsAppCredentials(supabase, tenantId);
            if (whatsappCreds) {
              const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
              const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total);
              const firstName = order.customer_name?.split(' ')[0] || 'Cliente';
              const adminMsg = `✅ *PAGAMENTO CONFIRMADO!*\n\n📦 Pedido: *#${order.order_number}*\n👤 Cliente: ${firstName}\n💰 Total: ${total}\n🕐 ${now}\n\nO pedido já está pronto para produção!`;
              
              await sendWhatsAppText(adminPhone, adminMsg, whatsappCreds);
              console.log('[asaas-webhook] ✅ Admin payment alert sent to', adminPhone);
            }
          }
        } catch (adminAlertError) {
          console.error('[asaas-webhook] Error sending admin alert:', adminAlertError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[asaas-webhook] Error:', error);
    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
