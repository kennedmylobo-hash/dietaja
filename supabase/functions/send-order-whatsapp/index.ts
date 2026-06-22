import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
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

function getFallbackTemplates(brandName: string): Record<string, string> {
  return {
    order_pix_pending: `🥗 *${brandName.toUpperCase()} - PEDIDO #{pedido}*\n\nOlá {nome}! 🎉\n\n📋 *ITENS:*\n{itens}\n\n💰 *Subtotal:* {subtotal}\n{taxa_entrega}\n{desconto}\n💵 *TOTAL:* {total}\n\n{entrega}\n\n────────────────\n💳 *PAGUE VIA PIX*\n\n📱 *Pague pelo link:*\n{pix_link}\n\nOu copie o código abaixo e cole no app do seu banco:\n\n\`\`\`{pix_code}\`\`\`\n\n⏳ Válido por 30 minutos\n────────────────\n\nDúvidas? Responda aqui! 💚`,
    order_whatsapp_pending: `🥗 *${brandName.toUpperCase()} - PEDIDO #{pedido}*\n\nOlá {nome}! Seu pedido foi registrado.\n\n📋 *ITENS:*\n{itens}\n\n💰 *Subtotal:* {subtotal}\n{taxa_entrega}\n{desconto}\n💵 *TOTAL:* {total}\n\n{entrega}\n\n⏳ *STATUS:* Reservado - Aguardando Pagamento\n\n────────────────\n💳 *Para confirmar seu pedido, realize o pagamento via:*\n\n• PIX\n• Cartão (Geramos o link)\n\n*Responda esta mensagem para combinar!* 💚\n────────────────`,
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
        { status: 400, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders').select('*').eq('id', order_id).single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    let messageType = '';
    if (status === 'pending') messageType = 'order_pix_pending';
    else if (status === 'whatsapp_pending') messageType = 'order_whatsapp_pending';
    else if (status === 'approved') messageType = 'order_confirmed';
    else {
      return new Response(JSON.stringify({ error: 'Invalid status' }),
        { status: 400, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    if (status === 'pending' && !pix_code) {
      return new Response(JSON.stringify({ error: 'pix_code required for pending status' }),
        { status: 400, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    // === ATOMIC DEDUP: WhatsApp (23505 = unique violation = já enviado) ===
    const { error: wpError } = await supabase
      .from('notification_events')
      .insert({ channel: 'whatsapp', event_type: 'sent', order_number: order.order_number, recipient_phone: order.customer_phone, template_name: messageType, tenant_id: order.tenant_id })
      .select('id')
      .single();

    if (wpError?.code === '23505') {
      console.log('WhatsApp already sent for order', order.order_number, 'type:', messageType, '— skipping');
      return new Response(JSON.stringify({ success: true, skipped: true }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    const branding = await getTenantBranding(supabase, order.tenant_id);
    const baseUrl = getTenantBaseUrl(branding);
    const whatsappCreds = await getWhatsAppCredentials(supabase, order.tenant_id);

    if (!whatsappCreds) {
      console.warn('WhatsApp credentials not configured, skipping');
      return new Response(JSON.stringify({ success: false, error: 'WhatsApp not configured' }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
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
      pix_link: order.id ? `${baseUrl}/pix/${order.id}` : '',
      link: `${baseUrl}/pedido/${order.order_number}`,
    };

    const message = replaceVariables(template, variables);
    const result = await sendWhatsAppText(order.customer_phone, message, whatsappCreds);

    // Update notification event (insert já foi feito no dedup)
    await supabase.from('notification_events').update({
      event_type: result.success ? 'sent' : 'failed',
      order_id: order_id,
      message_id: result.messageId,
      metadata: { response: result.response, error: result.error },
    }).eq('id', wpClaim.id);

    // Send admin notification for new orders — com dedup próprio
    if (status === 'pending' || status === 'whatsapp_pending') {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('admin_notify_phone')
        .eq('id', order.tenant_id)
        .maybeSingle();
      
      const adminPhone = tenantData?.admin_notify_phone || branding.whatsapp;
      if (adminPhone) {
        // Atomic dedup para admin notification
        const { error: adminDup } = await supabase
          .from('notification_events')
          .insert({ channel: 'whatsapp', event_type: 'sent', order_number: order.order_number, recipient_phone: adminPhone, template_name: `admin_${messageType}`, tenant_id: order.tenant_id })
          .select('id')
          .single();
        
        if (!adminDup || adminDup.code !== '23505') {
          const items = order.items as OrderItem[];
          const paymentLabel = status === 'pending' ? '💳 PIX' : '💬 WhatsApp';
          const adminMsg = `🔔 *NOVO PEDIDO!*\n\n📋 *#${order.order_number}*\n👤 ${order.customer_name}\n📱 ${order.customer_phone}\n\n${formatItems(items)}\n\n💵 *Total:* ${formatCurrency(order.total)}\n${order.delivery_option === 'delivery' ? '🚚 Entrega' : '🏪 Retirada'}\n${paymentLabel}\n\n⏰ ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;
          try {
            await sendWhatsAppText(adminPhone, adminMsg, whatsappCreds);
            console.log(`[ADMIN] ✅ Notification sent to ${adminPhone}`);
          } catch (e) {
            console.error(`[ADMIN] ❌ Failed to notify admin:`, e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'WhatsApp sent' }),
      { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in send-order-whatsapp:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
