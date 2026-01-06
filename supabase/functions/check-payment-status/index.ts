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

    // Get order number if status is approved
    let orderNumber = null;
    if (status === 'approved' && mpData.external_reference) {
      const { data: order } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', mpData.external_reference)
        .maybeSingle();
      
      orderNumber = order?.order_number;
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
