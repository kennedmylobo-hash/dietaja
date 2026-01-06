import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlavorSelection {
  name: string;
  quantity: number;
  category?: string;
}

interface CartItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: string;
  flavors?: FlavorSelection[];
}

interface RequestBody {
  items: CartItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  delivery: {
    option: 'pickup' | 'delivery';
    address?: string;
    fee: number;
  };
  utm_data?: Record<string, string>;
  coupon_code?: string;
  discount_amount?: number;
  order_id?: string;
}

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

    const body: RequestBody = await req.json();
    const { items, customer, delivery, utm_data, coupon_code, discount_amount, order_id } = body;

    console.log('Creating PIX payment for:', { customer: customer.name, items: items.length, order_id });

    // Calculate totals with discount applied
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = delivery.fee || 0;
    const discountValue = discount_amount || 0;
    const total = subtotal + deliveryFee - discountValue;

    // Ensure total is at least 1 (MP minimum) and round to 2 decimal places
    const transactionAmount = Math.max(Math.round(total * 100) / 100, 1);

    let orderId = order_id;

    // If no order_id provided, create new order
    if (!orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'pending',
          payment_method: 'pix',
          items: items,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          delivery_option: delivery.option,
          delivery_address: delivery.address || null,
          utm_data: utm_data || null,
          coupon_code: coupon_code || null,
          discount_amount: discountValue,
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error('Failed to create order');
      }

      orderId = order.id;
      console.log('Order created:', orderId);
    } else {
      // Update existing order to pending/pix status
      await supabase
        .from('orders')
        .update({ 
          status: 'pending', 
          payment_method: 'pix',
          total,
          discount_amount: discountValue,
        })
        .eq('id', orderId);
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/mp-webhook`;

    // Create PIX payment directly via Payments API
    const paymentPayload = {
      transaction_amount: transactionAmount,
      description: `Pedido Dieta Já - ${items.length} item(s)`,
      payment_method_id: 'pix',
      payer: {
        email: customer.email,
        first_name: customer.name.split(' ')[0],
        last_name: customer.name.split(' ').slice(1).join(' ') || customer.name.split(' ')[0],
      },
      external_reference: orderId,
      notification_url: webhookUrl,
    };

    console.log('Creating PIX payment with payload:', JSON.stringify(paymentPayload));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${orderId}-${Date.now()}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MP API error:', mpResponse.status, errorText);
      throw new Error(`Mercado Pago API error: ${mpResponse.status}`);
    }

    const mpData = await mpResponse.json();
    console.log('PIX payment created:', mpData.id, 'Status:', mpData.status);

    // Extract PIX data
    const pixData = mpData.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      console.error('No PIX data received:', mpData);
      throw new Error('No PIX QR code received from Mercado Pago');
    }

    // Update order with payment ID
    await supabase
      .from('orders')
      .update({ 
        mp_payment_id: mpData.id.toString(),
        mp_preference_id: mpData.id.toString(),
      })
      .eq('id', orderId);

    // Calculate expiration (PIX typically expires in 30 minutes)
    const expirationDate = mpData.date_of_expiration || 
      new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Send WhatsApp notification with order summary and PIX code
    console.log('Sending WhatsApp notification with PIX code...');
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          status: 'pending',
          pix_code: pixData.qr_code,
        }),
      });
      console.log('WhatsApp notification sent for pending order');
    } catch (whatsappError) {
      console.error('Error sending WhatsApp:', whatsappError);
      // Don't fail the request, WhatsApp is secondary
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        payment_id: mpData.id,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
        ticket_url: pixData.ticket_url,
        expiration_date: expirationDate,
        total: transactionAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-pix-payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao criar pagamento PIX. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
