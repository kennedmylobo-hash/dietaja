import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) throw new Error('ASAAS_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { plan_id, kit_type, kit_name, price, customer, delivery } = body;

    console.log('[create-club-subscription] Starting:', { kit_type, kit_name, price, customer: customer.name });

    // Validate required fields
    if (!customer?.name || !customer?.email || !customer?.phone || !customer?.cpf) {
      throw new Error('Dados do cliente incompletos');
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.slice(-11);

    // Step 1: Create/find customer in Asaas
    console.log('[create-club-subscription] Searching Asaas customer...');
    const searchResponse = await fetch(
      `${ASAAS_API_URL}/customers?email=${encodeURIComponent(customer.email)}`,
      { headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' } }
    );

    let asaasCustomerId: string | null = null;

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data?.length > 0) {
        asaasCustomerId = searchData.data[0].id;
        console.log('[create-club-subscription] Existing customer:', asaasCustomerId);
      }
    }

    if (!asaasCustomerId) {
      console.log('[create-club-subscription] Creating new customer...');
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
        console.error('[create-club-subscription] Customer creation error:', errorText);
        throw new Error('Erro ao criar cliente no gateway de pagamento');
      }

      const customerData = await customerResponse.json();
      asaasCustomerId = customerData.id;
      console.log('[create-club-subscription] Customer created:', asaasCustomerId);
    } else if (cleanCpf.length === 11 && !/^(\d)\1+$/.test(cleanCpf)) {
      // Update CPF on existing customer
      await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        method: 'PUT',
        headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfCnpj: cleanCpf }),
      });
    }

    // Step 2: Calculate next due date (tomorrow or next month 1st)
    const now = new Date();
    const nextDueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const formattedDate = nextDueDate.toISOString().split('T')[0];

    // Step 3: Create subscription in Asaas
    console.log('[create-club-subscription] Creating subscription...');
    const subscriptionPayload = {
      customer: asaasCustomerId,
      billingType: 'PIX',
      cycle: 'MONTHLY',
      value: price,
      nextDueDate: formattedDate,
      description: `Clube Dieta Já - ${kit_name}`,
      externalReference: `club_${kit_type}`,
    };

    const subscriptionResponse = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('[create-club-subscription] Subscription error:', errorText);

      await supabase.from('payment_error_logs').insert({
        error_code: subscriptionResponse.status.toString(),
        error_message: errorText,
        provider: 'asaas',
        request_payload: subscriptionPayload,
        customer_phone: customer.phone,
        customer_email: customer.email,
      });

      throw new Error('Erro ao criar assinatura no gateway');
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('[create-club-subscription] Subscription created:', subscriptionData.id);

    // Step 4: Save to club_subscriptions
    const { error: insertError } = await supabase.from('club_subscriptions').insert({
      asaas_subscription_id: subscriptionData.id,
      asaas_customer_id: asaasCustomerId,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_cpf: cleanCpf,
      delivery_option: delivery.option,
      delivery_address: delivery.address || null,
      kit_type,
      kit_name,
      price,
      status: 'active',
      next_due_date: formattedDate,
    });

    if (insertError) {
      console.error('[create-club-subscription] DB insert error:', insertError);
    }

    // Step 5: Get first payment ID from subscription
    console.log('[create-club-subscription] Fetching first payment...');
    const paymentsResponse = await fetch(
      `${ASAAS_API_URL}/subscriptions/${subscriptionData.id}/payments`,
      { headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' } }
    );

    let paymentId = null;
    if (paymentsResponse.ok) {
      const paymentsData = await paymentsResponse.json();
      if (paymentsData.data?.length > 0) {
        paymentId = paymentsData.data[0].id;
        console.log('[create-club-subscription] First payment ID:', paymentId);
      }
    }

    if (!paymentId) {
      // If no payment found yet, use subscription ID as fallback
      console.log('[create-club-subscription] No payment found, using subscription ID');
      paymentId = subscriptionData.id;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscriptionId: subscriptionData.id, 
        paymentId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-club-subscription] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
