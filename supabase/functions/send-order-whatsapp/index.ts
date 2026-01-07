import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (digits.startsWith('55')) {
    return digits;
  }
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

// Send simple text message (for messages within 24h window)
async function sendWhatsAppText(phone: string, message: string, orderNumber: string): Promise<void> {
  const apiToken = Deno.env.get('NOTIFICAME_API_TOKEN');
  const channelToken = Deno.env.get('NOTIFICAME_WHATSAPP_CHANNEL_TOKEN');

  if (!apiToken || !channelToken) {
    console.warn('NotificaMe tokens not configured, skipping WhatsApp');
    return;
  }

  const formattedPhone = formatPhone(phone);

  try {
    console.log(`[TEXT] Sending WhatsApp to ${formattedPhone} for order ${orderNumber}`);

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'X-Api-Token': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: channelToken,
        to: formattedPhone,
        contents: [{ type: 'text', text: message }],
      }),
    });

    const responseData = await response.text();
    console.log(`[TEXT] NotificaMe response for ${orderNumber}: ${response.status} - ${responseData}`);

    if (!response.ok) {
      console.error('[TEXT] NotificaMe API error:', response.status, responseData);
    }
  } catch (error) {
    console.error('[TEXT] Error sending WhatsApp:', error);
  }
}

// Send template message (for messages outside 24h window - Meta approved templates)
async function sendWhatsAppTemplate(
  phone: string, 
  templateId: string, 
  fields: Record<string, string>, 
  orderNumber: string
): Promise<void> {
  const apiToken = Deno.env.get('NOTIFICAME_API_TOKEN');
  const channelToken = Deno.env.get('NOTIFICAME_WHATSAPP_CHANNEL_TOKEN');

  if (!apiToken || !channelToken) {
    console.warn('NotificaMe tokens not configured, skipping WhatsApp');
    return;
  }

  const formattedPhone = formatPhone(phone);

  try {
    console.log(`[TEMPLATE] Sending WhatsApp template "${templateId}" to ${formattedPhone} for order ${orderNumber}`);
    console.log(`[TEMPLATE] Fields:`, JSON.stringify(fields));

    const payload = {
      from: channelToken,
      to: formattedPhone,
      contents: [{
        type: 'template',
        templateId: templateId,
        fields: fields
      }],
    };

    console.log(`[TEMPLATE] Full payload:`, JSON.stringify(payload));

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'X-Api-Token': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.text();
    console.log(`[TEMPLATE] NotificaMe response for ${orderNumber}: ${response.status} - ${responseData}`);

    if (!response.ok) {
      console.error('[TEMPLATE] NotificaMe API error:', response.status, responseData);
    } else {
      console.log(`[TEMPLATE] WhatsApp template sent successfully for order ${orderNumber}`);
    }
  } catch (error) {
    console.error('[TEMPLATE] Error sending WhatsApp template:', error);
  }
}

// Fallback templates if not found in database
const FALLBACK_TEMPLATES: Record<string, string> = {
  order_pix_pending: `🥗 *DIETA JÁ - PEDIDO #{pedido}*

Olá {nome}! Seu pedido foi registrado.

📋 *ITENS:*
{itens}

💵 *TOTAL:* {total}

{entrega}

⏳ *STATUS:* Aguardando Pagamento

────────────────
💳 *PAGUE VIA PIX:*

Copie o código abaixo:

\`\`\`{pix_code}\`\`\`

⚠️ Válido por 30 minutos
────────────────

Dúvidas? Responda esta mensagem! 💚`,

  order_whatsapp_pending: `🥗 *DIETA JÁ - PEDIDO #{pedido}*

Olá {nome}! Seu pedido foi registrado.

📋 *ITENS:*
{itens}

💵 *TOTAL:* {total}

{entrega}

⏳ *STATUS:* Reservado - Aguardando Pagamento

Responda esta mensagem para combinar o pagamento! 💚`,

  order_confirmed: `🥗 *DIETA JÁ - PEDIDO #{pedido}*

Olá {nome}! 🎉

✅ *PAGAMENTO CONFIRMADO!*

📋 *ITENS:*
{itens}

💵 *TOTAL PAGO:* {total}

{entrega}
📦 Entrega prevista em até 3 dias úteis

Seu pedido já está sendo preparado! 👨‍🍳

Obrigado pela preferência! 💚`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { order_id, status, pix_code } = body;

    console.log('send-order-whatsapp called:', { order_id, status, has_pix_code: !!pix_code });

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine message type based on status
    let messageType = '';
    if (status === 'pending') {
      messageType = 'order_pix_pending';
    } else if (status === 'whatsapp_pending') {
      messageType = 'order_whatsapp_pending';
    } else if (status === 'approved') {
      messageType = 'order_confirmed';
    } else {
      console.log('Invalid status:', status);
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For pending PIX, we need the pix_code
    if (status === 'pending' && !pix_code) {
      return new Response(
        JSON.stringify({ error: 'pix_code required for pending status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch template from database
    const { data: templateData, error: templateError } = await supabase
      .from('marketing_messages')
      .select('whatsapp_template, is_active')
      .eq('message_type', messageType)
      .single();

    if (templateError) {
      console.warn('Template not found in DB, using fallback:', messageType);
    }

    // Use database template if active, otherwise use fallback
    let template = FALLBACK_TEMPLATES[messageType];
    if (templateData && templateData.is_active && templateData.whatsapp_template) {
      template = templateData.whatsapp_template;
    }

    const items = order.items as OrderItem[];
    const deliveryInfo = order.delivery_option === 'delivery' 
      ? `🚚 *Entrega:* ${order.delivery_address || 'Endereço informado'}`
      : '🏪 *Retirada:* No local';

    // Build variables object
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
      link: `dietajavca.com.br/pedido/${order.order_number}`,
    };

    // Choose template based on status
    if (status === 'approved') {
      // Template: compra_confirmada_dieta with fields {{1}}, {{2}}, {{3}}, {{4}}
      console.log('Using template compra_confirmada_dieta for approved order');
      const templateFields = {
        "1": order.customer_name?.split(' ')[0] || 'cliente',
        "2": order.order_number || '',
        "3": formatItems(items).substring(0, 500), // Limit to avoid message too long
        "4": formatCurrency(order.total)
      };
      await sendWhatsAppTemplate(order.customer_phone, 'compra_confirmada_dieta', templateFields, order.order_number);
    } else if (status === 'pending' && pix_code) {
      // Template pix_pendente_dietaja aprovado pela Meta - ATIVADO
      const PIX_PENDING_TEMPLATE_ENABLED = true;
      
      if (PIX_PENDING_TEMPLATE_ENABLED) {
        // Template: pix_pendente_dietaja with fields {{1}}, {{2}}, {{3}}, {{4}}
        console.log('Using template pix_pendente_dietaja for pending PIX order');
        const templateFields = {
          "1": order.customer_name?.split(' ')[0] || 'cliente',
          "2": order.order_number || '',
          "3": formatCurrency(order.total),
          "4": pix_code
        };
        await sendWhatsAppTemplate(order.customer_phone, 'pix_pendente_dietaja', templateFields, order.order_number);
      } else {
        console.log('[SKIP] pix_pendente_dietaja template disabled - awaiting Meta approval');
        // Não envia WhatsApp para PIX pendente enquanto template não for aprovado
      }
    } else {
      // For whatsapp_pending or pending without pix, use text message
      console.log('Using text message for order (customer-initiated contact expected)');
      const message = replaceVariables(template, variables);
      await sendWhatsAppText(order.customer_phone, message, order.order_number);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'WhatsApp sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-order-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
