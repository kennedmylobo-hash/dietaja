import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
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

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cancelling Asaas payment for order:', order_id);

    // Get order with payment ID and tenant_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('mp_payment_id, order_number, status, tenant_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (!order.mp_payment_id) {
      console.log('No Asaas payment ID found for order, skipping cancellation');
      return new Response(
        JSON.stringify({ success: true, message: 'Pedido não tinha cobrança Asaas associada', cancelled: false }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Resolve tenant-specific Asaas credentials
    const asaasCredentials = await getAsaasCredentials(supabase, order.tenant_id);
    const asaasApiKey = asaasCredentials.apiKey;

    const paymentId = order.mp_payment_id;
    console.log('Cancelling Asaas payment:', paymentId);

    // Check payment status
    const statusResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
    });

    if (!statusResponse.ok) {
      return new Response(
        JSON.stringify({ success: true, message: 'Cobrança não encontrada no Asaas (pode já ter sido cancelada)', cancelled: false }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await statusResponse.json();
    console.log('Current payment status:', paymentData.status);

    if (['PENDING', 'OVERDUE'].includes(paymentData.status)) {
      const cancelResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
      });

      if (!cancelResponse.ok) {
        const errorText = await cancelResponse.text();
        console.error('Error cancelling payment:', cancelResponse.status, errorText);
        return new Response(
          JSON.stringify({ success: true, message: 'Erro ao cancelar no Asaas, mas pedido será cancelado', cancelled: false, error: errorText }),
          { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment cancelled successfully in Asaas');
      return new Response(
        JSON.stringify({ success: true, message: 'Cobrança cancelada no Asaas', cancelled: true, previous_status: paymentData.status }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: true, message: `Cobrança não pode ser cancelada (status: ${paymentData.status})`, cancelled: false, current_status: paymentData.status }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in cancel-asaas-payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
