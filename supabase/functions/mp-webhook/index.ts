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
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse notification from MP
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    // Also try to get from body
    let body: { data?: { id?: string }; id?: string; type?: string; topic?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body might be empty for some notifications
    }

    const paymentId = id || body?.data?.id || body?.id;
    const notificationType = topic || body?.type || body?.topic;

    console.log('Webhook received:', { topic: notificationType, id: paymentId, body });

    // Only process payment notifications
    if (notificationType !== 'payment' && notificationType !== 'merchant_order') {
      console.log('Ignoring notification type:', notificationType);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!paymentId) {
      console.log('No payment ID in notification');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch payment details from Mercado Pago
    console.log('Fetching payment details for ID:', paymentId);
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Error fetching payment:', paymentResponse.status, errorText);
      throw new Error(`Failed to fetch payment: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    console.log('Payment details:', {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      payment_method_id: payment.payment_method_id,
    });

    const orderId = payment.external_reference;
    if (!orderId) {
      console.log('No external_reference (order_id) in payment');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map MP status to our status
    let orderStatus = 'pending';
    if (payment.status === 'approved') {
      orderStatus = 'approved';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      orderStatus = 'rejected';
    } else if (payment.status === 'in_process' || payment.status === 'pending') {
      orderStatus = 'pending';
    }

    // Update order in database
    const updateData: Record<string, unknown> = {
      status: orderStatus,
      mp_payment_id: String(payment.id),
    };

    if (orderStatus === 'approved') {
      updateData.paid_at = new Date().toISOString();
    }

    console.log('Updating order:', orderId, updateData);

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw new Error('Failed to update order');
    }

    console.log('Order updated successfully:', orderId, orderStatus);

    return new Response(
      JSON.stringify({ received: true, order_id: orderId, status: orderStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Always return 200 to MP to avoid retries for errors we can't fix
    return new Response(
      JSON.stringify({ received: true, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
