import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";
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
    const { payment_id, order_id } = await req.json();
    
    const searchId = payment_id || order_id;
    if (!searchId) {
      return new Response(
        JSON.stringify({ success: false, error: 'payment_id or order_id is required' }),
        { status: 400, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching PIX details for:', searchId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, total, status, pix_qr_code, pix_qr_code_base64, pix_expiration, mp_payment_id')
      .or(`id.eq.${searchId},mp_payment_id.eq.${searchId}`)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found order:', order.order_number, 'Status:', order.status);

    // If we have stored PIX data, return it
    if (order.pix_qr_code) {
      return new Response(
        JSON.stringify({
          success: true,
          qr_code: order.pix_qr_code,
          qr_code_base64: order.pix_qr_code_base64 || '',
          total: Number(order.total),
          expiration: order.pix_expiration,
          status: order.status === 'approved' ? 'approved' : 'pending',
          order_number: order.order_number,
          customer_name: order.customer_name,
        }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // If no stored PIX data, try to fetch from Asaas
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey || !order.mp_payment_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados do PIX não disponíveis' }),
        { status: 404, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from Asaas
    const asaasUrl = 'https://api.asaas.com/v3';
    const pixResponse = await fetch(`${asaasUrl}/payments/${order.mp_payment_id}/pixQrCode`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!pixResponse.ok) {
      console.error('Asaas PIX fetch failed:', await pixResponse.text());
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar QR Code' }),
        { status: 500, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const pixData = await pixResponse.json();
    
    // Get payment details for expiration
    const paymentResponse = await fetch(`${asaasUrl}/payments/${order.mp_payment_id}`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    });

    let expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // Default 30min
    if (paymentResponse.ok) {
      const paymentData = await paymentResponse.json();
      if (paymentData.dueDate) {
        expiration = new Date(paymentData.dueDate + 'T23:59:59').toISOString();
      }
    }

    // Store PIX data for future requests
    await supabase
      .from('orders')
      .update({
        pix_qr_code: pixData.payload,
        pix_qr_code_base64: pixData.encodedImage,
        pix_expiration: expiration,
      })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        qr_code: pixData.payload,
        qr_code_base64: pixData.encodedImage,
        total: Number(order.total),
        expiration,
        status: order.status === 'approved' ? 'approved' : 'pending',
        order_number: order.order_number,
        customer_name: order.customer_name,
      }),
      { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-pix-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
