import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantBranding } from "../_shared/tenant-branding.ts";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";

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
  cashback?: {
    use: boolean;
    amount: number;
  };
  utm_data?: Record<string, string>;
  coupon_code?: string;
  discount_amount?: number;
  order_id?: string;
  tenant_id?: string;
}

// Asaas API base URL (production)
const ASAAS_API_URL = 'https://api.asaas.com/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { items, customer, delivery, utm_data, coupon_code, discount_amount, cashback, order_id, tenant_id } = body;
    const effectiveTenantId = tenant_id || '00000000-0000-0000-0000-000000000001';

    // Server-side CPF validation - reject before creating order or calling Asaas
    const cpfDigits = customer.cpf?.replace(/\D/g, '') || '';
    if (!cpfDigits || cpfDigits.length !== 11) {
      console.error('CPF missing or wrong length:', cpfDigits.length);
      return new Response(
        JSON.stringify({ success: false, error: 'CPF é obrigatório para pagamento PIX.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (/^(\d)\1+$/.test(cpfDigits)) {
      console.error('CPF with all same digits:', cpfDigits);
      return new Response(
        JSON.stringify({ success: false, error: 'CPF inválido. Verifique os números.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Validate CPF check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpfDigits[i]) * (10 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    if (rem !== parseInt(cpfDigits[9])) {
      console.error('CPF failed first check digit');
      return new Response(
        JSON.stringify({ success: false, error: 'CPF inválido. Verifique os números.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpfDigits[i]) * (11 - i);
    rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    if (rem !== parseInt(cpfDigits[10])) {
      console.error('CPF failed second check digit');
      return new Response(
        JSON.stringify({ success: false, error: 'CPF inválido. Verifique os números.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('CPF validation passed:', cpfDigits);

    // Resolve tenant-specific Asaas credentials
    const asaasCredentials = await getAsaasCredentials(supabase, effectiveTenantId);
    const asaasApiKey = asaasCredentials.apiKey;

    console.log('Creating Asaas PIX payment for:', { 
      customer: customer.name, 
      email: customer.email,
      cpf: customer.cpf,
      items: items.length, 
      order_id, 
      cashback 
    });

    // CPF is optional - clean if provided
    const cleanCpf = customer.cpf?.replace(/\D/g, '') || '';
    console.log('CPF info:', { original: customer.cpf, cleaned: cleanCpf, length: cleanCpf.length });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = delivery.fee || 0;
    const discountValue = discount_amount || 0;
    const cashbackValue = (cashback?.use && cashback?.amount) ? cashback.amount : 0;
    const total = subtotal + deliveryFee - discountValue - cashbackValue;
    const transactionAmount = Math.max(Math.round(total * 100) / 100, 1);

    let orderId = order_id;

    // Check for existing pending order from same customer (prevent duplicates)
    if (!orderId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('customer_email', customer.email)
        .in('status', ['pending', 'pix_failed'])
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingOrder) {
        orderId = existingOrder.id;
        console.log('Reusing existing pending order:', orderId, existingOrder.order_number);
        
        await supabase
          .from('orders')
          .update({ 
            status: 'pending', 
            payment_method: 'pix',
            items: items,
            subtotal,
            delivery_fee: deliveryFee,
            total,
            customer_name: customer.name,
            customer_phone: customer.phone,
            delivery_option: delivery.option,
            delivery_address: delivery.address || null,
            utm_data: utm_data || null,
            coupon_code: coupon_code || null,
            discount_amount: discountValue + cashbackValue,
          })
          .eq('id', orderId);
      }
    }

    // Create new order if no existing one found (with retry for duplicate order_number)
    if (!orderId) {
      const orderPayload = {
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
        discount_amount: discountValue + cashbackValue,
        tenant_id: effectiveTenantId,
      };

      let order = null;
      let orderError = null;
      const MAX_RETRIES = 2;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const result = await supabase
          .from('orders')
          .insert(orderPayload)
          .select('id, order_number')
          .single();

        if (!result.error) {
          order = result.data;
          orderError = null;
          break;
        }

        // Check for unique violation (duplicate order_number)
        if (result.error.code === '23505' && attempt < MAX_RETRIES) {
          console.warn(`Order insert attempt ${attempt + 1} failed with duplicate key, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        orderError = result.error;
      }

      if (orderError || !order) {
        console.error('Error creating order after retries:', orderError);
        throw new Error('Failed to create order');
      }

      orderId = order.id;
      console.log('Order created:', orderId, order.order_number);

      // If using cashback, deduct from balance
      if (cashbackValue > 0) {
        console.log('Processing cashback usage:', cashbackValue);
        try {
          await fetch(`${supabaseUrl}/functions/v1/process-cashback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: 'use',
              order_id: orderId,
              customer_email: customer.email,
              amount: cashbackValue,
            }),
          });
          console.log('Cashback deducted successfully');
        } catch (cashbackError) {
          console.error('Error processing cashback:', cashbackError);
        }
      }
    } else {
      await supabase
        .from('orders')
        .update({ 
          status: 'pending', 
          payment_method: 'pix',
          total,
          discount_amount: discountValue + cashbackValue,
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
      
      const customerPayload: Record<string, unknown> = {
        name: customer.name,
        email: customer.email,
        phone: formattedPhone,
        mobilePhone: formattedPhone,
        notificationDisabled: false,
      };
      
      // Only include CPF if provided and valid (11 digits)
      if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
        customerPayload.cpfCnpj = cleanCpf;
      }

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
        
        await supabase.from('payment_error_logs').insert({
          order_id: orderId,
          error_code: customerResponse.status.toString(),
          error_message: errorText,
          provider: 'asaas',
          request_payload: customerPayload,
          response_payload: JSON.parse(errorText || '{}'),
          customer_phone: customer.phone,
          customer_email: customer.email,
          tenant_id: effectiveTenantId,
        });

        throw new Error('Erro ao criar cliente no Asaas');
      }

      const customerData = await customerResponse.json();
      asaasCustomerId = customerData.id;
      console.log('Asaas customer created:', asaasCustomerId);
    } else if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
      console.log('Updating existing customer with CPF...');
      const updateResponse = await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        method: 'PUT',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpfCnpj: cleanCpf }),
      });

      if (!updateResponse.ok) {
        const updateErrorText = await updateResponse.text();
        console.error('Asaas customer CPF update error:', updateResponse.status, updateErrorText);
        
        let updateErrorResponse = {};
        try { updateErrorResponse = JSON.parse(updateErrorText || '{}'); } catch { updateErrorResponse = { raw_error: updateErrorText }; }

        await supabase.from('payment_error_logs').insert({
          order_id: orderId,
          error_code: updateResponse.status.toString(),
          error_message: `Erro ao atualizar CPF do cliente: ${updateErrorText}`,
          provider: 'asaas',
          request_payload: { cpfCnpj: cleanCpf },
          response_payload: updateErrorResponse,
          customer_phone: customer.phone,
          customer_email: customer.email,
          tenant_id: effectiveTenantId,
        });

        throw new Error(`Erro ao atualizar CPF do cliente no Asaas. Verifique os dados e tente novamente.`);
      }

      console.log('Asaas customer CPF updated successfully:', asaasCustomerId);
    }

    // Step 2: Create PIX payment (cobrança)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    
    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: transactionAmount,
      dueDate: dueDateStr,
      description: `Pedido ${(await getTenantBranding(supabase, effectiveTenantId)).brand_name} - ${items.length} item(s)`,
      externalReference: orderId,
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
      try { errorResponse = JSON.parse(errorText); } catch { errorResponse = { raw_error: errorText }; }

      await supabase.from('payment_error_logs').insert({
        order_id: orderId,
        error_code: paymentResponse.status.toString(),
        error_message: errorText,
        provider: 'asaas',
        request_payload: paymentPayload,
        response_payload: errorResponse,
        customer_phone: customer.phone,
        customer_email: customer.email,
        tenant_id: effectiveTenantId,
      });

      await supabase.from('orders').update({ status: 'pix_failed' }).eq('id', orderId);
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

    const expirationDate = new Date(paymentData.dueDate);
    expirationDate.setHours(23, 59, 59);

    const responseData = {
      success: true,
      order_id: orderId,
      payment_id: paymentData.id,
      qr_code: pixData.payload,
      qr_code_base64: pixData.encodedImage,
      invoice_url: paymentData.invoiceUrl,
      expiration_date: expirationDate.toISOString(),
      total: transactionAmount,
    };

    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil((async () => {
      try {
        await supabase
          .from('orders')
          .update({ 
            mp_payment_id: paymentData.id,
            mp_preference_id: paymentData.id,
            pix_qr_code: pixData.payload,
            pix_qr_code_base64: pixData.encodedImage,
            pix_expiration: expirationDate.toISOString(),
          })
          .eq('id', orderId);
        console.log('✅ Order updated with PIX data in background');
      } catch (dbError) {
        console.error('❌ Background DB update error:', dbError);
      }

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
        console.log('✅ WhatsApp notification sent in background');
      } catch (whatsappError) {
        console.error('❌ Background WhatsApp error:', whatsappError);
      }
    })());

    console.log('Returning PIX data immediately (background tasks running)');
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-asaas-pix:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro ao criar pagamento PIX. Tente novamente.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
