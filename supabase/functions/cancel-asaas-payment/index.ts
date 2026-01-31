import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cancelling Asaas payment for order:', order_id);

    // Get order with payment ID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('mp_payment_id, order_number, status')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's an Asaas payment ID
    if (!order.mp_payment_id) {
      console.log('No Asaas payment ID found for order, skipping cancellation');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pedido não tinha cobrança Asaas associada',
          cancelled: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentId = order.mp_payment_id;
    console.log('Cancelling Asaas payment:', paymentId);

    // First, check the payment status
    const statusResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Error checking payment status:', statusResponse.status, errorText);
      // Payment might already be deleted or not found
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cobrança não encontrada no Asaas (pode já ter sido cancelada)',
          cancelled: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await statusResponse.json();
    console.log('Current payment status:', paymentData.status);

    // Only cancel if payment is pending or overdue
    if (['PENDING', 'OVERDUE'].includes(paymentData.status)) {
      // Cancel the payment in Asaas
      const cancelResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!cancelResponse.ok) {
        const errorText = await cancelResponse.text();
        console.error('Error cancelling payment:', cancelResponse.status, errorText);
        
        // Log the error but don't fail - the order will still be cancelled
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Erro ao cancelar no Asaas, mas pedido será cancelado',
            cancelled: false,
            error: errorText 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment cancelled successfully in Asaas');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cobrança cancelada no Asaas',
          cancelled: true,
          previous_status: paymentData.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Payment not in cancellable state:', paymentData.status);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Cobrança não pode ser cancelada (status: ${paymentData.status})`,
          cancelled: false,
          current_status: paymentData.status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in cancel-asaas-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao cancelar cobrança' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
