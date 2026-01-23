import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse Asaas webhook payload
    const body = await req.json();
    
    console.log('[asaas-webhook] Received:', JSON.stringify(body));

    const { event, payment } = body;

    if (!payment) {
      console.log('[asaas-webhook] No payment data in webhook');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = payment.externalReference;
    const asaasPaymentId = payment.id;

    console.log('[asaas-webhook] Event:', event, 'Order:', orderId, 'Payment:', asaasPaymentId);

    if (!orderId) {
      console.log('[asaas-webhook] No externalReference (order_id) in payment');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map Asaas event to order status
    let orderStatus = 'pending';
    
    // Asaas payment events:
    // PAYMENT_CONFIRMED - PIX/boleto paid
    // PAYMENT_RECEIVED - Money received in account
    // PAYMENT_OVERDUE - Past due date
    // PAYMENT_DELETED - Payment deleted
    // PAYMENT_REFUNDED - Refunded
    // PAYMENT_ANTICIPATED - Anticipation
    // PAYMENT_AWAITING_RISK_ANALYSIS - Under analysis
    
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      orderStatus = 'approved';
    } else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED') {
      orderStatus = 'rejected';
    } else if (event === 'PAYMENT_REFUNDED') {
      orderStatus = 'refunded';
    } else {
      // For other events, just log and acknowledge
      console.log('[asaas-webhook] Non-actionable event:', event);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if order already processed
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('status, stock_decremented, customer_email, customer_phone, order_number')
      .eq('id', orderId)
      .maybeSingle();

    if (checkError) {
      console.error('[asaas-webhook] Error checking existing order:', checkError);
    }

    // Skip if already approved
    if (existingOrder?.status === 'approved') {
      console.log('[asaas-webhook] Order already approved, skipping:', orderId);
      return new Response(
        JSON.stringify({ received: true, message: 'Order already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status
    const updateData: Record<string, unknown> = {
      status: orderStatus,
      mp_payment_id: asaasPaymentId,
      payment_method: 'pix',
    };

    if (orderStatus === 'approved') {
      updateData.paid_at = new Date().toISOString();
    }

    console.log('[asaas-webhook] Updating order:', orderId, updateData);

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('[asaas-webhook] Error updating order:', updateError);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[asaas-webhook] Order updated successfully:', orderId, orderStatus);

    // If payment approved, trigger post-payment actions
    if (orderStatus === 'approved' && existingOrder) {
      console.log('[asaas-webhook] Payment approved, triggering post-payment actions');

      // Fetch full order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('[asaas-webhook] Error fetching order:', orderError);
      } else if (order) {
        // Cancel orphan orders from same customer
        console.log('[asaas-webhook] Cancelling orphan orders for:', order.customer_email);
        const { data: cancelledOrders, error: cancelError } = await supabase
          .from('orders')
          .update({ 
            status: 'cancelled',
            cancellation_type: 'auto_orphan'
          })
          .eq('customer_email', order.customer_email)
          .in('status', ['pending', 'awaiting_payment'])
          .neq('id', orderId)
          .select('id, order_number');

        if (!cancelError && cancelledOrders?.length) {
          console.log('[asaas-webhook] Orphan orders cancelled:', cancelledOrders.length);
          
          // Record cancellation in history
          for (const cancelled of cancelledOrders) {
            await supabase.from('order_status_history').insert({
              order_id: cancelled.id,
              previous_status: 'pending',
              new_status: 'cancelled',
              changed_by_name: 'Sistema',
              notes: `Cancelado automaticamente - Pedido #${order.order_number} foi pago`
            });
          }
        }

        // Mark cart as converted
        if (order.customer_phone) {
          const normalizedPhone = order.customer_phone.replace(/\D/g, '');
          const phoneSuffix = normalizedPhone.slice(-10);
          
          await supabase
            .from('carts')
            .update({ status: 'converted' })
            .ilike('phone', `%${phoneSuffix}`)
            .in('status', ['active', 'abandoned']);
          
          console.log('[asaas-webhook] Cart marked as converted');
        }

        // Send approval email
        console.log('[asaas-webhook] Sending approval email...');
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-order-approved`, {
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
          console.log('[asaas-webhook] Approval email sent');
        } catch (emailError) {
          console.error('[asaas-webhook] Error sending email:', emailError);
        }

        // Decrement stock
        if (!order.stock_decremented) {
          console.log('[asaas-webhook] Decrementing stock...');
          try {
            await fetch(`${supabaseUrl}/functions/v1/decrement-stock`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ order_id: orderId }),
            });
            console.log('[asaas-webhook] Stock decremented');
          } catch (stockError) {
            console.error('[asaas-webhook] Error decrementing stock:', stockError);
          }
        }

        // Send WhatsApp confirmation
        console.log('[asaas-webhook] Sending WhatsApp confirmation...');
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
          console.log('[asaas-webhook] WhatsApp confirmation sent');
        } catch (whatsappError) {
          console.error('[asaas-webhook] Error sending WhatsApp:', whatsappError);
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[asaas-webhook] Error:', error);
    // Always return 200 to avoid retries
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
