import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: string;
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
}

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

    const body: RequestBody = await req.json();
    const { items, customer, delivery, utm_data } = body;

    console.log('Creating MP preference for:', { customer: customer.name, items: items.length });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = delivery.fee || 0;
    const total = subtotal + deliveryFee;

    // Create order in database
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
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error('Failed to create order');
    }

    console.log('Order created:', order.id);

    // Build Mercado Pago preference
    const mpItems = items.map(item => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: 'BRL',
    }));

    // Add delivery fee as separate item if applicable
    if (deliveryFee > 0) {
      mpItems.push({
        title: 'Taxa de entrega',
        quantity: 1,
        unit_price: deliveryFee,
        currency_id: 'BRL',
      });
    }

    const baseUrl = req.headers.get('origin') || 'https://dietaja.com.br';
    const webhookUrl = `${supabaseUrl}/functions/v1/mp-webhook`;

    const preference = {
      items: mpItems,
      payer: {
        name: customer.name,
        email: customer.email,
        phone: {
          number: customer.phone.replace(/\D/g, ''),
        },
      },
      back_urls: {
        success: `${baseUrl}/pagamento/sucesso?order_id=${order.id}`,
        failure: `${baseUrl}/pagamento/erro?order_id=${order.id}`,
        pending: `${baseUrl}/pagamento/sucesso?order_id=${order.id}&status=pending`,
      },
      auto_return: 'approved',
      notification_url: webhookUrl,
      external_reference: order.id,
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' },
          { id: 'atm' },
        ],
        installments: 1,
      },
      statement_descriptor: 'DIETA JA',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    };

    console.log('Creating MP preference with webhook:', webhookUrl);

    // Create preference in Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MP API error:', mpResponse.status, errorText);
      throw new Error(`Mercado Pago API error: ${mpResponse.status}`);
    }

    const mpData = await mpResponse.json();
    console.log('MP preference created:', mpData.id);

    // Update order with MP preference ID
    await supabase
      .from('orders')
      .update({ mp_preference_id: mpData.id })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        init_point: mpData.init_point,
        preference_id: mpData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log detailed error internally for debugging
    console.error('Error in create-mp-preference:', error);
    // Return generic error message to client
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao processar pagamento. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
