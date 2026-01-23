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
    cpf?: string;
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

// Asaas API base URL (production)
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

    const body: RequestBody = await req.json();
    const { items, customer, delivery, utm_data, coupon_code, discount_amount, order_id } = body;

    console.log('Creating Asaas PIX payment for:', { customer: customer.name, items: items.length, order_id });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = delivery.fee || 0;
    const discountValue = discount_amount || 0;
    const total = subtotal + deliveryFee - discountValue;
    const transactionAmount = Math.max(Math.round(total * 100) / 100, 1);

    let orderId = order_id;

    // Create or update order
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
        .select('id, order_number')
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error('Failed to create order');
      }

      orderId = order.id;
      console.log('Order created:', orderId, order.order_number);
    } else {
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

    // Step 1: Create or find customer in Asaas
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 11 
      ? cleanPhone 
      : cleanPhone.length === 10 
        ? cleanPhone 
        : cleanPhone.slice(-11);

    // Search for existing customer by email
    console.log('Searching for existing Asaas customer...');
    const searchResponse = await fetch(
      `${ASAAS_API_URL}/customers?email=${encodeURIComponent(customer.email)}`,
      {
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    let asaasCustomerId: string | null = null;

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data && searchData.data.length > 0) {
        asaasCustomerId = searchData.data[0].id;
        console.log('Existing Asaas customer found:', asaasCustomerId);
      }
    }

    // Create new customer if not found
    if (!asaasCustomerId) {
      console.log('Creating new Asaas customer...');
      // Use CPF from customer data, fallback to placeholder if not provided
      const customerCpf = customer.cpf?.replace(/\D/g, '') || '00000000000';
      
      const customerPayload = {
        name: customer.name,
        email: customer.email,
        phone: formattedPhone,
        mobilePhone: formattedPhone,
        cpfCnpj: customerCpf,
        notificationDisabled: false,
      };

      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerPayload),
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('Asaas customer creation error:', customerResponse.status, errorText);
        
        // Log error to database
        await supabase.from('payment_error_logs').insert({
          order_id: orderId,
          error_code: customerResponse.status.toString(),
          error_message: errorText,
          provider: 'asaas',
          request_payload: customerPayload,
          response_payload: JSON.parse(errorText || '{}'),
          customer_phone: customer.phone,
          customer_email: customer.email,
        });

        throw new Error('Erro ao criar cliente no Asaas');
      }

      const customerData = await customerResponse.json();
      asaasCustomerId = customerData.id;
      console.log('Asaas customer created:', asaasCustomerId);
    } else {
      // Update existing customer with CPF from request
      const customerCpf = customer.cpf?.replace(/\D/g, '') || '00000000000';
      console.log('Updating existing customer with CPF...');
      await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        method: 'PUT',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpfCnpj: customerCpf,
        }),
      });
    }

    // Step 2: Create PIX payment (cobrança)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook`;

    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: transactionAmount,
      dueDate: dueDateStr,
      description: `Pedido Dieta Já - ${items.length} item(s)`,
      externalReference: orderId,
      callback: {
        successUrl: `${supabaseUrl.replace('supabase.co', 'lovable.app').replace('/rest/v1', '')}/pagamento/sucesso?order_id=${orderId}`,
      },
    };

    console.log('Creating Asaas PIX payment:', JSON.stringify(paymentPayload));

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Asaas payment error:', paymentResponse.status, errorText);
      
      let errorResponse = {};
      try {
        errorResponse = JSON.parse(errorText);
      } catch {
        errorResponse = { raw_error: errorText };
      }

      // Log error to database
      await supabase.from('payment_error_logs').insert({
        order_id: orderId,
        error_code: paymentResponse.status.toString(),
        error_message: errorText,
        provider: 'asaas',
        request_payload: paymentPayload,
        response_payload: errorResponse,
        customer_phone: customer.phone,
        customer_email: customer.email,
      });

      // Mark order as failed
      await supabase
        .from('orders')
        .update({ status: 'pix_failed' })
        .eq('id', orderId);

      throw new Error('Erro ao criar cobrança PIX. Tente novamente ou finalize via WhatsApp.');
    }

    const paymentData = await paymentResponse.json();
    console.log('Asaas payment created:', paymentData.id, 'Status:', paymentData.status);

    // Step 3: Get PIX QR Code
    const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!pixResponse.ok) {
      const errorText = await pixResponse.text();
      console.error('Asaas PIX QR Code error:', pixResponse.status, errorText);
      throw new Error('Erro ao gerar QR Code PIX');
    }

    const pixData = await pixResponse.json();
    console.log('PIX QR Code generated successfully');

    // Update order with Asaas payment ID
    await supabase
      .from('orders')
      .update({ 
        mp_payment_id: paymentData.id,
        mp_preference_id: paymentData.id,
      })
      .eq('id', orderId);

    // Calculate expiration (PIX expires at due date midnight)
    const expirationDate = new Date(paymentData.dueDate);
    expirationDate.setHours(23, 59, 59);

    // Send WhatsApp notification with PIX code
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
          pix_code: pixData.payload,
        }),
      });
      console.log('WhatsApp notification sent for pending order');
    } catch (whatsappError) {
      console.error('Error sending WhatsApp:', whatsappError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        payment_id: paymentData.id,
        qr_code: pixData.payload,
        qr_code_base64: pixData.encodedImage,
        invoice_url: paymentData.invoiceUrl,
        expiration_date: expirationDate.toISOString(),
        total: transactionAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-asaas-pix:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao criar pagamento PIX. Tente novamente.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
