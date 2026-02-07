import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

serve(async (req) => {
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
        .select('mp_payment_id, status, order_number, tenant_id')
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

      if (order.status === 'approved') {
        return new Response(
          JSON.stringify({ status: 'approved', order_number: order.order_number }),
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

        if (order.status !== 'approved') {
          console.log('[check-payment-status] Updating order to approved:', orderId);
          
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'approved',
              paid_at: new Date().toISOString(),
              mp_payment_id: String(paymentIdToCheck),
              payment_method: 'pix',
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error updating order:', updateError);
          } else {
            // Cancel orphan orders
            const { data: cancelledOrders, error: cancelError } = await supabase
              .from('orders')
              .update({ status: 'cancelled', cancellation_type: 'auto_orphan' })
              .eq('customer_email', order.customer_email)
              .in('status', ['pending', 'awaiting_payment'])
              .neq('id', orderId)
              .select('id, order_number, status');
            
            if (!cancelError && cancelledOrders?.length) {
              console.log('[check-payment-status] Orphan orders cancelled:', cancelledOrders.length);
              for (const cancelled of cancelledOrders) {
                await supabase.from('order_status_history').insert({
                  order_id: cancelled.id,
                  previous_status: 'awaiting_payment',
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

            // Send confirmation email
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
              console.error('[check-payment-status] Error sending email:', emailError);
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
                console.error('[check-payment-status] Error decrementing stock:', stockError);
              }
            }

            // Send WhatsApp confirmation
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ order_id: orderId, status: 'approved' }),
              });
            } catch (whatsappError) {
              console.error('[check-payment-status] Error sending WhatsApp:', whatsappError);
            }
          }
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
