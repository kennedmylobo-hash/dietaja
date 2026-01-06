import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate Mercado Pago webhook signature
async function validateSignature(
  req: Request,
  url: URL,
  body: Record<string, unknown>,
  webhookSecret: string
): Promise<boolean> {
  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    console.log('Missing signature headers');
    return false;
  }

  // Parse signature parts: ts=xxx,v1=xxx
  const signatureParts = xSignature.split(',');
  const ts = signatureParts.find(p => p.startsWith('ts='))?.split('=')[1];
  const hash = signatureParts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!ts || !hash) {
    console.log('Invalid signature format');
    return false;
  }

  // Get data.id from query params or body
  const dataId = url.searchParams.get('data.id') || (body?.data as Record<string, unknown>)?.id || body?.id;

  // Build the manifest string
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // Calculate HMAC SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest));
  const computedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const isValid = hash === computedHash;
  if (!isValid) {
    console.error('Signature mismatch', { received: hash, computed: computedHash });
  }

  return isValid;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    console.log('Webhook received:', { topic: notificationType, id: paymentId });

    // Validate signature if secret is configured
    const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET');
    if (webhookSecret) {
      const isValid = await validateSignature(req, url, body, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature - rejecting request');
        return new Response('Unauthorized', { 
          status: 401, 
          headers: corsHeaders 
        });
      }
      console.log('Webhook signature validated successfully');
    } else {
      console.warn('MP_WEBHOOK_SECRET not configured - skipping signature validation');
    }

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
      // Return 200 to avoid MP retries for errors we can't fix
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    console.log('Updating order:', orderId, { status: orderStatus });

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      // Return 200 to avoid MP retries
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated successfully:', orderId, orderStatus);

    // If payment approved, send confirmation email and decrement stock
    if (orderStatus === 'approved') {
      console.log(`[mp-webhook] Payment approved for order ${orderId}`);
      
      // Fetch order details for email
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order for email:', orderError);
      } else if (order) {
        // Send order approved email
        console.log('[mp-webhook] Sending order approved email...');
        try {
          const emailResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-order-approved`,
            {
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
                payment_method: 'mercadopago'
              }),
            }
          );
          
          const emailResult = await emailResponse.json();
          console.log('[mp-webhook] Email response:', emailResult);
        } catch (emailError) {
          console.error('[mp-webhook] Error sending approved email:', emailError);
        }

        // Decrement stock if not already done
        if (!order.stock_decremented) {
          console.log('[mp-webhook] Decrementing stock...');
          try {
            const decrementResponse = await fetch(
              `${supabaseUrl}/functions/v1/decrement-stock`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({ order_id: orderId }),
              }
            );
            
            const decrementResult = await decrementResponse.json();
            console.log('[mp-webhook] Stock decrement result:', decrementResult);
          } catch (decrementError) {
            console.error('[mp-webhook] Error decrementing stock:', decrementError);
          }
        } else {
          console.log('[mp-webhook] Stock already decremented for this order');
        }

        // Send WhatsApp confirmation
        console.log('[mp-webhook] Sending WhatsApp confirmation...');
        try {
          await fetch(
            `${supabaseUrl}/functions/v1/send-order-whatsapp`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                order_id: orderId,
                status: 'approved',
              }),
            }
          );
          console.log('[mp-webhook] WhatsApp confirmation sent');
        } catch (whatsappError) {
          console.error('[mp-webhook] Error sending WhatsApp:', whatsappError);
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-webhook:', error);
    // Always return 200 to MP to avoid retries for errors we can't fix
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
