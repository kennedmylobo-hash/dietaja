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
  status: 'pending' | 'approved';
  pix_code?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPhone(phone: string): string {
  // Remove non-digits and ensure it starts with country code
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

async function sendWhatsAppMessage(phone: string, message: string, orderNumber: string): Promise<void> {
  const apiToken = Deno.env.get('NOTIFICAME_API_TOKEN');
  const channelToken = Deno.env.get('NOTIFICAME_WHATSAPP_CHANNEL_TOKEN');

  if (!apiToken || !channelToken) {
    console.warn('NotificaMe tokens not configured, skipping WhatsApp');
    return;
  }

  const formattedPhone = formatPhone(phone);

  try {
    const response = await fetch('https://hub.notificame.com.br/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'whatsapp',
        channelToken: channelToken,
        to: formattedPhone,
        type: 'text',
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NotificaMe API error:', response.status, errorText);
    } else {
      console.log(`WhatsApp sent successfully for order ${orderNumber} to ${formattedPhone}`);
    }
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
  }
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

    const items = order.items as OrderItem[];
    const deliveryInfo = order.delivery_option === 'delivery' 
      ? `🚚 *Entrega:* ${order.delivery_address || 'Endereço informado'}`
      : '🏪 *Retirada:* No local';

    let message = '';

    if (status === 'pending' && pix_code) {
      // Message for pending payment with PIX code
      const today = new Date();
      const expirationTime = new Date(today.getTime() + 30 * 60 * 1000);
      const timeStr = expirationTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      message = `🥗 *DIETA JÁ - PEDIDO #${order.order_number}*

Olá ${order.customer_name?.split(' ')[0] || 'cliente'}! Seu pedido foi registrado com sucesso.

📋 *ITENS:*
${formatItems(items)}

💰 *Subtotal:* ${formatCurrency(order.subtotal)}
${order.delivery_fee > 0 ? `🚚 *Taxa de entrega:* ${formatCurrency(order.delivery_fee)}` : ''}
${order.discount_amount > 0 ? `🎁 *Desconto:* -${formatCurrency(order.discount_amount)}` : ''}
💵 *TOTAL:* ${formatCurrency(order.total)}

${deliveryInfo}

⏳ *STATUS:* Aguardando Pagamento

────────────────
💳 *PAGUE VIA PIX:*

Copie o código abaixo e cole no app do seu banco:

\`\`\`${pix_code}\`\`\`

⚠️ Válido até ${timeStr} (30 min)
────────────────

Dúvidas? Responda esta mensagem! 💚`;

    } else if (status === 'approved') {
      // Message for approved payment
      message = `🥗 *DIETA JÁ - PEDIDO #${order.order_number}*

Olá ${order.customer_name?.split(' ')[0] || 'cliente'}! 🎉

✅ *PAGAMENTO CONFIRMADO!*

📋 *ITENS:*
${formatItems(items)}

💰 *Subtotal:* ${formatCurrency(order.subtotal)}
${order.delivery_fee > 0 ? `🚚 *Taxa de entrega:* ${formatCurrency(order.delivery_fee)}` : ''}
${order.discount_amount > 0 ? `🎁 *Desconto:* -${formatCurrency(order.discount_amount)}` : ''}
💵 *TOTAL PAGO:* ${formatCurrency(order.total)}

${deliveryInfo}

Seu pedido já está sendo preparado! 👨‍🍳

Acompanhe o status: dietajavca.com.br/pedido/${order.order_number}

Obrigado pela preferência! 💚`;
    } else {
      console.log('Invalid status or missing pix_code for pending');
      return new Response(
        JSON.stringify({ error: 'Invalid status or missing pix_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send WhatsApp message
    await sendWhatsAppMessage(order.customer_phone, message, order.order_number);

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
