import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { item_name, amount, customer, delivery, tenant_id } = body;
    const effectiveTenantId = tenant_id || '00000000-0000-0000-0000-000000000001';

    if (!customer?.name || !customer?.email || !customer?.phone || !customer?.cpf) {
      throw new Error('Dados do cliente incompletos');
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.slice(-11);
    const deliveryFee = delivery?.fee || 0;
    const totalAmount = Math.round(amount * 100) / 100;

    const asaasCredentials = await getAsaasCredentials(supabase, effectiveTenantId);
    const asaasApiKey = asaasCredentials.apiKey;

    console.log('[create-asaas-credit] Starting:', { item_name, amount: totalAmount, customer: customer.name });

    // Step 1: Create or find customer in Asaas
    const searchResponse = await fetch(
      `${ASAAS_API_URL}/customers?email=${encodeURIComponent(customer.email)}`,
      { headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' } }
    );

    let asaasCustomerId: string | null = null;

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data?.length > 0) {
        asaasCustomerId = searchData.data[0].id;
      }
    }

    if (!asaasCustomerId) {
      const customerPayload: Record<string, unknown> = {
        name: customer.name,
        email: customer.email,
        phone: formattedPhone,
        mobilePhone: formattedPhone,
        notificationDisabled: false,
      };

      if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
        customerPayload.cpfCnpj = cleanCpf;
      }

      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(customerPayload),
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('[create-asaas-credit] Customer creation error:', errorText);
        throw new Error('Erro ao criar cliente no gateway');
      }

      const customerData = await customerResponse.json();
      asaasCustomerId = customerData.id;
    } else if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
      await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        method: 'PUT',
        headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfCnpj: cleanCpf }),
      });
    }

    // Step 2: Create order in DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        status: 'pending',
        payment_method: 'credit_card',
        items: [{ name: item_name, quantity: 1, unitPrice: totalAmount - deliveryFee, totalPrice: totalAmount - deliveryFee, type: 'kit-mensal' }],
        subtotal: totalAmount - deliveryFee,
        delivery_fee: deliveryFee,
        total: totalAmount,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        delivery_option: delivery?.option || 'pickup',
        delivery_address: delivery?.address || null,
        tenant_id: effectiveTenantId,
      })
      .select('id, order_number')
      .single();

    if (orderError) {
      console.error('[create-asaas-credit] Order insert error:', orderError);
      throw new Error('Erro ao criar pedido');
    }

    console.log('[create-asaas-credit] Order created:', order.id, order.order_number);

    // Step 3: Create payment link in Asaas
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Allows PIX + credit card on the checkout page
      value: totalAmount,
      dueDate: dueDateStr,
      description: item_name,
      externalReference: order.id,
    };

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('[create-asaas-credit] Payment error:', errorText);

      await supabase.from('payment_error_logs').insert({
        order_id: order.id,
        error_code: paymentResponse.status.toString(),
        error_message: errorText,
        provider: 'asaas',
        request_payload: paymentPayload,
        customer_phone: customer.phone,
        customer_email: customer.email,
        tenant_id: effectiveTenantId,
      });

      throw new Error('Erro ao criar cobrança');
    }

    const paymentData = await paymentResponse.json();
    console.log('[create-asaas-credit] Payment created:', paymentData.id);

    // Update order with payment ID
    await supabase.from('orders').update({
      mp_payment_id: paymentData.id,
      mp_preference_id: paymentData.id,
    }).eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_link: paymentData.invoiceUrl,
        payment_id: paymentData.id,
        order_id: order.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-asaas-credit] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar pagamento. Tente novamente.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
