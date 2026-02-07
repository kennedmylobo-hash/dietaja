import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type?: string;
  flavors?: { name: string; quantity: number }[];
}

interface RequestBody {
  order_id: string;
  status: 'pending' | 'approved' | 'whatsapp_pending';
  pix_code?: string;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

function formatItems(items: OrderItem[]): string {
  return items.map(item => {
    let line = `• ${item.quantity}x ${item.name} - ${formatCurrency(item.totalPrice)}`;
    if (item.flavors && item.flavors.length > 0) {
      const flavorsStr = item.flavors.map(f => `${f.quantity}x ${f.name}`).join(', ');
      line += `\n  _${flavorsStr}_`;
    }
    return line;
  }).join('\n');
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

async function sendWhatsAppText(phone: string, message: string, orderNumber: string, apiToken: string, channelToken: string): Promise<void> {
  const formattedPhone = formatPhone(phone);
  try {
    console.log(`[TEXT] Sending WhatsApp to ${formattedPhone} for order ${orderNumber}`);
    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: { 'X-Api-Token': apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: channelToken, to: formattedPhone, contents: [{ type: 'text', text: message }] }),
    });
    const responseData = await response.text();
    console.log(`[TEXT] NotificaMe response for ${orderNumber}: ${response.status} - ${responseData}`);
    if (!response.ok) console.error('[TEXT] NotificaMe API error:', response.status, responseData);
  } catch (error) {
    console.error('[TEXT] Error sending WhatsApp:', error);
  }
}

async function sendWhatsAppTemplate(
  phone: string, templateName: string, fields: Record<string, string>,
  orderNumber: string, supabaseClient: any, apiToken: string, channelToken: string,
  orderId?: string
): Promise<{ success: boolean; error?: string; response?: any; messageId?: string }> {
  const formattedPhone = formatPhone(phone);
  try {
    console.log(`[TEMPLATE] Sending "${templateName}" to ${formattedPhone} for order ${orderNumber}`);
    const fieldKeys = Object.keys(fields).sort((a, b) => Number(a) - Number(b));
    const parameters = fieldKeys.map(key => ({ type: "text", text: fields[key] }));

    const payload = {
      from: channelToken, to: formattedPhone,
      contents: [{ type: 'template', template: { name: templateName, language: { code: 'pt_BR' }, components: [{ type: 'body', parameters }] } }],
    };

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: { 'X-Api-Token': apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.text();
    let responseJson = null;
    try { responseJson = JSON.parse(responseData); } catch (e) {}
    const messageId = responseJson?.id || responseJson?.messageId;
    const fullResponse = { status: response.status, ok: response.ok, body: responseJson || responseData };

    if (!response.ok) {
      console.error(`[TEMPLATE] ❌ API ERROR for order ${orderNumber}`);
      await supabaseClient.from('notification_events').insert({
        channel: 'whatsapp', event_type: 'failed', order_id: orderId,
        order_number: orderNumber, recipient_phone: formattedPhone,
        template_name: templateName, message_id: messageId,
        metadata: { error: responseData, response: fullResponse }
      });
      return { success: false, error: responseData, response: fullResponse };
    } else {
      console.log(`[TEMPLATE] ✅ WhatsApp sent successfully for order ${orderNumber}`);
      await supabaseClient.from('notification_events').insert({
        channel: 'whatsapp', event_type: 'sent', order_id: orderId,
        order_number: orderNumber, recipient_phone: formattedPhone,
        template_name: templateName, message_id: messageId,
        metadata: { response: fullResponse }
      });
      return { success: true, response: fullResponse, messageId };
    }
  } catch (error) {
    console.error('[TEMPLATE] ❌ Exception sending WhatsApp template:', error);
    return { success: false, error: String(error) };
  }
}

function getFallbackTemplates(brandName: string): Record<string, string> {
  return {
    order_pix_pending: `🥗 *${brandName.toUpperCase()} - PEDIDO #{pedido}*\n\nOlá {nome}! Seu pedido foi registrado.\n\n📋 *ITENS:*\n{itens}\n\n💵 *TOTAL:* {total}\n\n{entrega}\n\n⏳ *STATUS:* Aguardando Pagamento\n\n────────────────\n💳 *PAGUE VIA PIX:*\n\nCopie o código abaixo:\n\n\`\`\`{pix_code}\`\`\`\n\n⚠️ Válido por 30 minutos\n────────────────\n\nDúvidas? Responda esta mensagem! 💚`,
    order_whatsapp_pending: `🥗 *${brandName.toUpperCase()} - PEDIDO #{pedido}*\n\nOlá {nome}! Seu pedido foi registrado.\n\n📋 *ITENS:*\n{itens}\n\n💵 *TOTAL:* {total}\n\n{entrega}\n\n⏳ *STATUS:* Reservado - Aguardando Pagamento\n\nResponda esta mensagem para combinar o pagamento! 💚`,
    order_confirmed: `🥗 *${brandName.toUpperCase()} - PEDIDO #{pedido}*\n\nOlá {nome}! 🎉\n\n✅ *PAGAMENTO CONFIRMADO!*\n\n📋 *ITENS:*\n{itens}\n\n💵 *TOTAL PAGO:* {total}\n\n{entrega}\n📦 Entrega prevista em até 3 dias úteis\n\nSeu pedido já está sendo preparado! 👨‍🍳\n\nObrigado pela preferência! 💚`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`\n========================================`);
    console.log(`[START] send-order-whatsapp invoked at ${new Date().toISOString()}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { order_id, status, pix_code } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders').select('*').eq('id', order_id).single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve tenant branding & credentials
    const branding = await getTenantBranding(supabase, order.tenant_id);
    const baseUrl = getTenantBaseUrl(branding);
    const whatsappCreds = await getWhatsAppCredentials(supabase, order.tenant_id);

    if (!whatsappCreds) {
      console.warn('WhatsApp credentials not configured, skipping');
      return new Response(JSON.stringify({ success: false, error: 'WhatsApp not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let messageType = '';
    if (status === 'pending') messageType = 'order_pix_pending';
    else if (status === 'whatsapp_pending') messageType = 'order_whatsapp_pending';
    else if (status === 'approved') messageType = 'order_confirmed';
    else {
      return new Response(JSON.stringify({ error: 'Invalid status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (status === 'pending' && !pix_code) {
      return new Response(JSON.stringify({ error: 'pix_code required for pending status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch template from database
    const { data: templateData } = await supabase
      .from('marketing_messages').select('whatsapp_template, is_active')
      .eq('message_type', messageType).single();

    const FALLBACK_TEMPLATES = getFallbackTemplates(branding.brand_name);
    let template = FALLBACK_TEMPLATES[messageType];
    if (templateData && templateData.is_active && templateData.whatsapp_template) {
      template = templateData.whatsapp_template;
    }

    const items = order.items as OrderItem[];
    const deliveryInfo = order.delivery_option === 'delivery'
      ? `🚚 *Entrega:* ${order.delivery_address || 'Endereço informado'}`
      : '🏪 *Retirada:* No local';

    const variables: Record<string, string> = {
      nome: order.customer_name?.split(' ')[0] || 'cliente',
      pedido: order.order_number || '',
      total: formatCurrency(order.total),
      subtotal: formatCurrency(order.subtotal),
      itens: formatItems(items),
      entrega: deliveryInfo,
      taxa_entrega: order.delivery_fee > 0 ? `🚚 *Taxa de entrega:* ${formatCurrency(order.delivery_fee)}` : '',
      desconto: order.discount_amount > 0 ? `🎁 *Desconto:* -${formatCurrency(order.discount_amount)}` : '',
      pix_code: pix_code || '',
      link: `${baseUrl}/pedido/${order.order_number}`,
    };

    if (status === 'approved') {
      const itemsList = items.map(i => `${i.quantity}x ${i.name}`).join(', ').substring(0, 200);
      const templateFields = {
        "1": order.customer_name?.split(' ')[0] || 'cliente',
        "2": order.order_number || '',
        "3": itemsList,
        "4": formatCurrency(order.total)
      };
      await sendWhatsAppTemplate(order.customer_phone, 'compraa_confrimadaa', templateFields,
        order.order_number, supabase, whatsappCreds.apiToken, whatsappCreds.channelToken, order_id);
    } else if (status === 'pending' && pix_code) {
      const pixPageLink = `${baseUrl}/pix/${order_id}`;
      const templateFields = {
        "1": order.customer_name?.split(' ')[0] || 'cliente',
        "2": order.order_number || '',
        "3": formatCurrency(order.total),
        "4": `Acesse para pagar: ${pixPageLink}`
      };
      await sendWhatsAppTemplate(order.customer_phone, 'pix_pendente_dietaja', templateFields,
        order.order_number, supabase, whatsappCreds.apiToken, whatsappCreds.channelToken, order_id);
    } else {
      const message = replaceVariables(template, variables);
      await sendWhatsAppText(order.customer_phone, message, order.order_number, whatsappCreds.apiToken, whatsappCreds.channelToken);
    }

    return new Response(JSON.stringify({ success: true, message: 'WhatsApp sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in send-order-whatsapp:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
