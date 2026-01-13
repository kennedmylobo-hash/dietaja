import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
}

interface AbandonedCart {
  id: string;
  phone: string;
  name: string | null;
  items: CartItem[];
  subtotal: number;
  created_at: string;
  last_activity_at: string;
  reminder_sent_at: string | null;
  whatsapp_sent_at: string | null;
  whatsapp_2_sent_at: string | null;
}

async function sendWhatsAppMessage(phone: string, message: string, apiToken: string, channelToken: string): Promise<boolean> {
  try {
    // Format phone number (remove non-digits, add country code if needed)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`Sending WhatsApp cart reminder to ${formattedPhone}`);

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'X-Api-Token': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: channelToken,
        to: formattedPhone,
        contents: [
          {
            type: 'text',
            text: message,
          }
        ],
      }),
    });

    const responseData = await response.text();
    console.log(`NotificaMe cart reminder response: ${response.status} - ${responseData}`);

    return response.ok;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

function generateCartReminderMessage(cart: AbandonedCart, isSecondReminder: boolean = false): string {
  const firstName = cart.name?.split(' ')[0] || 'Cliente';
  
  // Format items list
  const itemsList = cart.items
    .map(item => `• ${item.quantity}x ${item.name}`)
    .join('\n');

  const subtotalFormatted = cart.subtotal.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });

  if (isSecondReminder) {
    return `⏰ *Última chance, ${firstName}!*

Seu carrinho ainda está esperando:

${itemsList}

💰 *Total: ${subtotalFormatted}*

🎁 Não perca essa oportunidade! Finalize agora e garanta sua alimentação saudável da semana.

👉 Acesse: https://dietajavca.com.br

_Dieta Já - Alimentação saudável em Vitória da Conquista_ 🥗`;
  }

  return `Oi, ${firstName}! 👋

Vi que você deixou alguns itens no carrinho da *Dieta Já*:

${itemsList}

💰 *Total: ${subtotalFormatted}*

Falta pouco para finalizar! 🛒

👉 Acesse: https://dietajavca.com.br

Qualquer dúvida, é só responder essa mensagem! 😊

_Dieta Já - Alimentação saudável em Vitória da Conquista_ 🥗`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting cart reminders job...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const notificameApiToken = Deno.env.get('NOTIFICAME_API_TOKEN');
    const notificameChannelToken = Deno.env.get('NOTIFICAME_WHATSAPP_CHANNEL_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Fetch carts that need first reminder (active, last activity > 1 hour, no reminder sent)
    const { data: firstReminderCarts, error: firstError } = await supabase
      .from('carts')
      .select('*')
      .eq('status', 'active')
      .lt('last_activity_at', oneHourAgo.toISOString())
      .is('whatsapp_sent_at', null)
      .not('items', 'eq', '[]');

    if (firstError) {
      console.error('Error fetching first reminder carts:', firstError);
      throw firstError;
    }

    // Fetch carts that need second reminder (active, last activity > 3 hours, first reminder sent, no second reminder)
    const { data: secondReminderCarts, error: secondError } = await supabase
      .from('carts')
      .select('*')
      .eq('status', 'active')
      .lt('last_activity_at', threeHoursAgo.toISOString())
      .not('whatsapp_sent_at', 'is', null)
      .is('whatsapp_2_sent_at', null)
      .not('items', 'eq', '[]');

    if (secondError) {
      console.error('Error fetching second reminder carts:', secondError);
      throw secondError;
    }

    console.log(`Found ${firstReminderCarts?.length || 0} carts for first reminder`);
    console.log(`Found ${secondReminderCarts?.length || 0} carts for second reminder`);

    let whatsappSent = 0;
    let whatsapp2Sent = 0;
    const errors: string[] = [];

    // Process first reminders
    if (notificameApiToken && notificameChannelToken && firstReminderCarts) {
      for (const cart of firstReminderCarts as AbandonedCart[]) {
        if (!cart.phone || !cart.items || cart.items.length === 0) continue;

        const message = generateCartReminderMessage(cart, false);
        const sent = await sendWhatsAppMessage(cart.phone, message, notificameApiToken, notificameChannelToken);

        if (sent) {
          // Update cart with reminder timestamp and mark as abandoned
          const { error: updateError } = await supabase
            .from('carts')
            .update({
              whatsapp_sent_at: now.toISOString(),
              status: 'abandoned',
            })
            .eq('id', cart.id);

          if (updateError) {
            console.error(`Error updating cart ${cart.id}:`, updateError);
            errors.push(`Failed to update cart ${cart.id}`);
          } else {
            whatsappSent++;
            console.log(`First reminder sent for cart ${cart.id} - ${cart.name}`);
          }
        } else {
          errors.push(`Failed to send WhatsApp to ${cart.phone}`);
        }
      }
    }

    // Process second reminders
    if (notificameApiToken && notificameChannelToken && secondReminderCarts) {
      for (const cart of secondReminderCarts as AbandonedCart[]) {
        if (!cart.phone || !cart.items || cart.items.length === 0) continue;

        const message = generateCartReminderMessage(cart, true);
        const sent = await sendWhatsAppMessage(cart.phone, message, notificameApiToken, notificameChannelToken);

        if (sent) {
          const { error: updateError } = await supabase
            .from('carts')
            .update({
              whatsapp_2_sent_at: now.toISOString(),
            })
            .eq('id', cart.id);

          if (updateError) {
            console.error(`Error updating cart ${cart.id}:`, updateError);
            errors.push(`Failed to update cart ${cart.id}`);
          } else {
            whatsapp2Sent++;
            console.log(`Second reminder sent for cart ${cart.id} - ${cart.name}`);
          }
        } else {
          errors.push(`Failed to send second WhatsApp to ${cart.phone}`);
        }
      }
    }

    const result = {
      success: true,
      processed: {
        firstReminders: firstReminderCarts?.length || 0,
        secondReminders: secondReminderCarts?.length || 0,
        whatsappSent,
        whatsapp2Sent,
      },
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Cart reminders job completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-cart-reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
