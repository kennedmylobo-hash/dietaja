import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantBranding } from "../_shared/tenant-branding.ts";
import { getAsaasCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

interface RequestBody {
  order_id: string;
  send_whatsapp?: boolean;
  send_email?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { order_id, send_whatsapp = true, send_email = true } = body;

    if (!order_id) throw new Error('order_id is required');

    console.log('Admin generating PIX for order:', order_id);

    const { data: order, error: orderError } = await supabase
      .from('orders').select('*').eq('id', order_id).single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      throw new Error('Pedido não encontrado');
    }

    // Resolve tenant-specific Asaas credentials
    const asaasCredentials = await getAsaasCredentials(supabase, order.tenant_id);
    const asaasApiKey = asaasCredentials.apiKey;

    console.log('Order found:', order.order_number, 'Status:', order.status, 'Total:', order.total);

    // Check existing valid PIX
    if (order.pix_qr_code && order.pix_expiration) {
      const expirationDate = new Date(order.pix_expiration);
      if (expirationDate > new Date()) {
        console.log('Reusing existing valid PIX');
        const notificationResults = await sendNotifications(supabaseUrl, supabaseKey, order, order.pix_qr_code, send_whatsapp, send_email);
        return new Response(
          JSON.stringify({ success: true, reused: true, pix_code: order.pix_qr_code, pix_link: `https://diet-on-demand.lovable.app/pix/${order_id}`, qr_code_base64: order.pix_qr_code_base64, expiration: order.pix_expiration, total: order.total, notifications: notificationResults }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get or create Asaas customer
    const cleanPhone = order.customer_phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 11 ? cleanPhone : cleanPhone.slice(-11);

    const searchResponse = await fetch(
      `${ASAAS_API_URL}/customers?email=${encodeURIComponent(order.customer_email)}`,
      { headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' } }
    );

    let asaasCustomerId: string | null = null;
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.data?.length > 0) asaasCustomerId = searchData.data[0].id;
    }

    if (!asaasCustomerId) {
      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: order.customer_name, email: order.customer_email, phone: formattedPhone, mobilePhone: formattedPhone, notificationDisabled: false }),
      });

      if (!customerResponse.ok) throw new Error('Erro ao criar cliente no Asaas');
      const customerData = await customerResponse.json();
      asaasCustomerId = customerData.id;
    }

    // Create PIX payment
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: Math.round(order.total * 100) / 100,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Pedido ${order.order_number || order.id.slice(0, 8)} - ${(await getTenantBranding(supabase, order.tenant_id)).brand_name}`,
      externalReference: order_id,
    };

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentResponse.ok) throw new Error('Erro ao criar cobrança PIX no Asaas');
    const paymentData = await paymentResponse.json();

    // Get PIX QR Code
    const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
      headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
    });

    if (!pixResponse.ok) throw new Error('Erro ao gerar QR Code PIX');
    const pixData = await pixResponse.json();

    const expirationDate = new Date(paymentData.dueDate);
    expirationDate.setHours(23, 59, 59);

    await supabase.from('orders').update({
      mp_payment_id: paymentData.id, mp_preference_id: paymentData.id,
      pix_qr_code: pixData.payload, pix_qr_code_base64: pixData.encodedImage,
      pix_expiration: expirationDate.toISOString(), payment_method: 'pix',
    }).eq('id', order_id);

    const notificationResults = await sendNotifications(supabaseUrl, supabaseKey, order, pixData.payload, send_whatsapp, send_email);

    return new Response(
      JSON.stringify({ success: true, reused: false, pix_code: pixData.payload, pix_link: `https://diet-on-demand.lovable.app/pix/${order_id}`, qr_code_base64: pixData.encodedImage, expiration: expirationDate.toISOString(), total: order.total, notifications: notificationResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-pix-admin:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro ao gerar PIX' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNotifications(supabaseUrl: string, supabaseKey: string, order: Record<string, unknown>, pixCode: string, sendWhatsapp: boolean, sendEmail: boolean): Promise<{ whatsapp_sent: boolean; email_sent: boolean }> {
  const results = { whatsapp_sent: false, email_sent: false };
  const promises: Promise<void>[] = [];

  if (sendWhatsapp) {
    promises.push(
      fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ order_id: order.id, status: 'pending', pix_code: pixCode }),
      }).then(async (r) => { if (r.ok) { results.whatsapp_sent = true; } }).catch(() => {})
    );
  }

  if (sendEmail) {
    promises.push(
      fetch(`${supabaseUrl}/functions/v1/send-order-pending-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ order_id: order.id, order_number: order.order_number || (order.id as string).slice(0, 8), customer_email: order.customer_email, customer_name: order.customer_name, total: order.total, pix_code: pixCode }),
      }).then(async (r) => { if (r.ok) { results.email_sent = true; } }).catch(() => {})
    );
  }

  await Promise.all(promises);
  return results;
}
