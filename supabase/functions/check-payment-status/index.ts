import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

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

    // If only order_id provided, get payment_id from database
    if (!paymentIdToCheck && order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('mp_payment_id, status, order_number')
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

      // If order already approved in DB, return immediately
      if (order.status === 'approved') {
        return new Response(
          JSON.stringify({ 
            status: 'approved',
            order_number: order.order_number,
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

    // Check payment status with Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentIdToCheck}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MP API error:', mpResponse.status, errorText);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to check payment status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpData = await mpResponse.json();
    console.log('Payment status check:', paymentIdToCheck, 'Status:', mpData.status);

    // Map MP status to our status
    let status = 'pending';
    if (mpData.status === 'approved') {
      status = 'approved';
    } else if (mpData.status === 'rejected' || mpData.status === 'cancelled') {
      status = 'rejected';
    } else if (mpData.status === 'in_process' || mpData.status === 'pending') {
      status = 'pending';
    }

    // Get order number and handle approved payments
    let orderNumber = null;
    
    if (status === 'approved' && mpData.external_reference) {
      const orderId = mpData.external_reference;
      
      // Fetch complete order
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

        // Only process if order is not yet approved (avoid duplicates)
        if (order.status !== 'approved') {
          console.log('[check-payment-status] Updating order to approved:', orderId);
          
          // Update order status
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'approved',
              paid_at: new Date().toISOString(),
              mp_payment_id: String(paymentIdToCheck),
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error updating order:', updateError);
          } else {
            // Cancel orphan orders from same customer
            console.log('[check-payment-status] Cancelling orphan orders for customer:', order.customer_email);
            const { error: cancelError } = await supabase
              .from('orders')
              .update({ status: 'cancelled' })
              .eq('customer_email', order.customer_email)
              .in('status', ['pending', 'awaiting_payment'])
              .neq('id', orderId);
            
            if (cancelError) {
              console.error('[check-payment-status] Error cancelling orphan orders:', cancelError);
            } else {
              console.log('[check-payment-status] Orphan orders cancelled for:', order.customer_email);
            }

            // Send confirmation email
            console.log('[check-payment-status] Sending approved email...');
            try {
              const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-approved`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
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
                  payment_method: 'pix'
                }),
              });
              console.log('[check-payment-status] Email response:', emailResponse.status);
            } catch (emailError) {
              console.error('[check-payment-status] Error sending email:', emailError);
            }

            // Decrement stock if not already done
            if (!order.stock_decremented) {
              console.log('[check-payment-status] Decrementing stock...');
              try {
                await fetch(`${supabaseUrl}/functions/v1/decrement-stock`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({ order_id: orderId }),
                });
                console.log('[check-payment-status] Stock decremented');
              } catch (stockError) {
                console.error('[check-payment-status] Error decrementing stock:', stockError);
              }
            }

            // Send WhatsApp confirmation
            console.log('[check-payment-status] Sending WhatsApp confirmation...');
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  order_id: orderId,
                  status: 'approved',
                }),
              });
              console.log('[check-payment-status] WhatsApp confirmation sent');
            } catch (whatsappError) {
              console.error('[check-payment-status] Error sending WhatsApp:', whatsappError);
            }
          }
        } else {
          console.log('[check-payment-status] Order already approved, skipping notifications');
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        status,
        order_number: orderNumber,
        mp_status: mpData.status,
        mp_status_detail: mpData.status_detail,
      }),
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
