import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";

import { buildWebhookCorsHeaders } from "../_shared/cors.ts";
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
      return new Response(JSON.stringify({ received: true }), { headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } });
    }

    const orderId = payment.externalReference;
    const asaasPaymentId = payment.id;

    console.log('[asaas-webhook] Event:', event, 'Order:', orderId, 'Payment:', asaasPaymentId);

    if (!orderId) {
      return new Response(JSON.stringify({ received: true }), { headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ received: true }), { headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } });
    }

    // UPDATE atômico: só atualiza se NÃO estiver approved ainda (evita race condition)
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        mp_payment_id: asaasPaymentId,
        payment_method: 'pix',
        ...(orderStatus === 'approved' ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId)
      .neq('status', 'approved')  // ← CRÍTICO: não reprocessa pedidos já aprovados
      .select('status, stock_decremented, customer_email, customer_phone, order_number, tenant_id')
      .single();

    if (updateError?.code === 'PGRST116') {
      // Nenhuma linha encontrada com status != 'approved' — já foi processado
      console.log('[asaas-webhook] Order already approved, skipping:', orderId);
      return new Response(JSON.stringify({ received: true, message: 'Order already processed' }), { headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } });
    }

    if (updateError) {
      console.error('[asaas-webhook] Error updating order:', updateError);
      return new Response(JSON.stringify({ received: true }), { headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } });
    }

    console.log('[asaas-webhook] Order updated successfully:', orderId, orderStatus);

    if (orderStatus === 'approved' && updatedOrder) {
      // @ts-expect-error - EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil((async () => {
        const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (orderError || !order) return;

        // Cancel orphan orders
        try {
          const { data: cancelledOrders } = await supabase
            .from('orders').update({ status: 'cancelled', cancellation_type: 'auto_orphan' })
            .eq('customer_email', order.customer_email)
            .in('status', ['pending', 'awaiting_payment'])
            .neq('id', orderId).select('id, order_number');
          if (cancelledOrders?.length) {
            for (const c of cancelledOrders) {
              await supabase.from('order_status_history').insert({
                order_id: c.id, previous_status: 'pending', new_status: 'cancelled',
                changed_by_name: 'Sistema',
                notes: `Cancelado - Pedido #${order.order_number} foi pago`,
                tenant_id: order.tenant_id || '00000000-0000-0000-0000-000000000001',
              });
            }
          }
        } catch (e) { console.error('[asaas-webhook] cancel error:', e); }

        // Mark cart as converted
        if (order.customer_phone) {
          const p = order.customer_phone.replace(/\D/g, '').slice(-10);
          await supabase.from('carts').update({ status: 'converted' })
            .ilike('phone', `%${p}`).in('status', ['active', 'abandoned']).catch(() => {});
        }

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-order-approved`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              order_number: order.order_number, customer_email: order.customer_email,
              customer_name: order.customer_name, customer_phone: order.customer_phone,
              items: order.items, subtotal: order.subtotal, delivery_fee: order.delivery_fee || 0,
              total: order.total, delivery_option: order.delivery_option,
              delivery_address: order.delivery_address, payment_method: 'pix',
              tenant_id: order.tenant_id,
            }),
          });
        } catch (e) { console.error('[asaas-webhook] email error:', e); }

        // Decrement stock
        if (!order.stock_decremented) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/decrement-stock`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
              body: JSON.stringify({ order_id: orderId }),
            });
          } catch (e) { console.error('[asaas-webhook] stock error:', e); }
        }

        // Process cashback
        try {
          await fetch(`${supabaseUrl}/functions/v1/process-cashback`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({ action: 'credit', order_id: orderId, customer_email: order.customer_email, order_total: order.total }),
          });
        } catch (e) { console.error('[asaas-webhook] cashback error:', e); }

        // Meta CAPI Purchase event
        try {
          await fetch(`${supabaseUrl}/functions/v1/meta-capi`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
            body: JSON.stringify({
              event_name: 'Purchase', event_id: `purchase_${orderId}`,
              value: order.total, currency: 'BRL',
              customer_email: order.customer_email, customer_phone: order.customer_phone,
              source_url: `https://diet-on-demand.lovable.app/pagamento-sucesso?order_id=${orderId}`,
              tenant_id: order.tenant_id,
              custom_data: { order_id: orderId, payment_method: 'pix' },
            }),
          });
        } catch (e) { console.error('[asaas-webhook] meta error:', e); }

        // WhatsApp alert to admin
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
              const msg = `✅ *PAGAMENTO CONFIRMADO!*\n\n📦 Pedido: *#${order.order_number}*\n👤 ${order.customer_name?.split(' ')[0] || 'Cliente'}\n💰 Total: ${total}\n🕐 ${now}`;
              await sendWhatsAppText(adminPhone, msg, whatsappCreds);
            }
          }
        } catch (e) { console.error('[asaas-webhook] admin alert error:', e); }
      })());
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[asaas-webhook] Error:', error);
    return new Response(JSON.stringify({ received: true }), { headers: { ...buildWebhookCorsHeaders(), 'Content-Type': 'application/json' } });
  }
});
