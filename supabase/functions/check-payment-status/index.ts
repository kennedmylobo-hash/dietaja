import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const ASAAS_API_URL = 'https://api.asaas.com/v3';

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { payment_id, order_id } = await req.json();

    if (!payment_id && !order_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id or order_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let paymentIdToCheck = payment_id;
    let orderTenantId: string | null = null;

    // If only order_id provided, get payment_id from database
    if (!paymentIdToCheck && order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('mp_payment_id, status, order_number, tenant_id, total, customer_email, customer_phone, customer_name, payment_method, items, delivery_option')
        .eq('id', order_id)
        .maybeSingle();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        throw new Error('Failed to fetch order');
      }

      if (!order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      orderTenantId = order.tenant_id;

      // If already approved/paid, return immediately with full data
      if (['approved', 'paid'].includes(order.status)) {
        return new Response(
          JSON.stringify({
            status: 'approved',
            order_number: order.order_number,
            total: order.total,
            customer_email: order.customer_email,
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            items: order.items,
            delivery_option: order.delivery_option,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For InfinitePay orders without Asaas payment ID, return pending status with data
      if (order.payment_method === 'infinitepay' && !order.mp_payment_id) {
        return new Response(
          JSON.stringify({
            status: 'pending',
            message: 'Aguardando confirmação InfinitePay',
            total: order.total,
            customer_email: order.customer_email,
            customer_phone: order.customer_phone,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      paymentIdToCheck = order.mp_payment_id;
    }

    if (!paymentIdToCheck) {
      return new Response(
        JSON.stringify({ status: 'pending', message: 'Payment not yet created' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve tenant-specific Asaas credentials
    const asaasCredentials = await getAsaasCredentials(supabase, orderTenantId);
    const asaasApiKey = asaasCredentials.apiKey;

    console.log('[check-payment-status] Checking Asaas payment:', paymentIdToCheck);
    
    const asaasResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentIdToCheck}`, {
      method: 'GET',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!asaasResponse.ok) {
      const errorText = await asaasResponse.text();
      console.error('Asaas API error:', asaasResponse.status, errorText);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to check payment status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const asaasData = await asaasResponse.json();
    console.log('[check-payment-status] Asaas payment status:', asaasData.status);

    let status = 'pending';
    if (asaasData.status === 'RECEIVED' || asaasData.status === 'CONFIRMED' || asaasData.status === 'RECEIVED_IN_CASH') {
      status = 'approved';
    } else if (asaasData.status === 'OVERDUE' || asaasData.status === 'REFUNDED') {
      status = 'rejected';
    } else if (asaasData.status === 'PENDING' || asaasData.status === 'AWAITING_RISK_ANALYSIS') {
      status = 'pending';
    }

    let orderNumber = null;
    const orderId = asaasData.externalReference || order_id;
    
    if (status === 'approved' && orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) {
        console.error('Error fetching order:', orderError);
      }

      if (order) {
        orderNumber = order.order_number;

        // UPDATE atômico: só atualiza se NÃO estiver approved
        const { error: updateError, data: updatedOrder } = await supabase
          .from('orders')
          .update({ 
            status: 'approved',
            paid_at: new Date().toISOString(),
            mp_payment_id: String(paymentIdToCheck),
            payment_method: 'pix',
          })
          .eq('id', orderId)
          .neq('status', 'approved')
          .select('id')
          .maybeSingle();

        if (updateError) {
          console.error('Error updating order:', updateError);
        } else if (updatedOrder) {
          // Só processa background se realmente atualizou (venceu a corrida)
          // @ts-expect-error - EdgeRuntime is available in Supabase Edge Functions
          EdgeRuntime.waitUntil((async () => {
              // Cancel orphan orders
              try {
                const { data: cancelledOrders } = await supabase
                  .from('orders')
                  .update({ status: 'cancelled', cancellation_type: 'auto_orphan' })
                  .eq('customer_email', order.customer_email)
                  .in('status', ['pending', 'awaiting_payment'])
                  .neq('id', orderId)
                  .select('id, order_number');
                if (cancelledOrders?.length) {
                  for (const c of cancelledOrders) {
                    await supabase.from('order_status_history').insert({
                      order_id: c.id, previous_status: 'awaiting_payment',
                      new_status: 'cancelled', changed_by_name: 'Sistema',
                      notes: `Cancelado - Pedido #${order.order_number} foi pago`,
                      tenant_id: order.tenant_id || '00000000-0000-0000-0000-000000000001',
                    });
                  }
                }
              } catch (e) { console.error('[check-payment-status] cancel error:', e); }

              // Mark cart as converted
              if (order.customer_phone) {
                const p = order.customer_phone.replace(/\D/g, '').slice(-10);
                await supabase.from('carts').update({ status: 'converted' })
                  .ilike('phone', `%${p}`).in('status', ['active', 'abandoned']).catch(() => {});
              }

              // Send confirmation email (dedup feito dentro de send-order-approved)
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
              } catch (e) { console.error('[check-payment-status] email error:', e); }

              // Decrement stock
              if (!order.stock_decremented) {
                try {
                  await fetch(`${supabaseUrl}/functions/v1/decrement-stock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                    body: JSON.stringify({ order_id: orderId }),
                  });
                } catch (e) { console.error('[check-payment-status] stock error:', e); }
              }

              // Send WhatsApp confirmation
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                  body: JSON.stringify({ order_id: orderId, status: 'approved' }),
                });
              } catch (e) { console.error('[check-payment-status] whatsapp error:', e); }
            })());
        }
      }
    }

    return new Response(
      JSON.stringify({ status, order_number: orderNumber, asaas_status: asaasData.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-payment-status:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: 'Erro ao verificar status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
