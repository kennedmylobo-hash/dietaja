import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText, type EvolutionCredentials } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem { name: string; quantity: number; totalPrice: number; type: string; }

interface AbandonedCart {
  id: string; phone: string; name: string | null; items: CartItem[]; subtotal: number;
  created_at: string; last_activity_at: string; reminder_sent_at: string | null;
  whatsapp_sent_at: string | null; whatsapp_2_sent_at: string | null; tenant_id: string | null;
}

function generateCartReminderMessage(cart: AbandonedCart, brandName: string, baseUrl: string, city: string, isSecondReminder: boolean = false): string {
  const firstName = cart.name?.split(' ')[0] || 'Cliente';
  const itemsList = cart.items.map(item => `• ${item.quantity}x ${item.name}`).join('\n');
  const subtotalFormatted = cart.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (isSecondReminder) {
    return `⏰ *Última chance, ${firstName}!*\n\nSeu carrinho ainda está esperando:\n\n${itemsList}\n\n💰 *Total: ${subtotalFormatted}*\n\n🎁 Não perca essa oportunidade! Finalize agora.\n\n👉 Acesse: ${baseUrl}\n\n_${brandName} - Alimentação saudável em ${city}_ 🥗`;
  }

  return `Oi, ${firstName}! 👋\n\nVi que você deixou alguns itens no carrinho da *${brandName}*:\n\n${itemsList}\n\n💰 *Total: ${subtotalFormatted}*\n\nFalta pouco para finalizar! 🛒\n\n👉 Acesse: ${baseUrl}\n\nQualquer dúvida, é só responder essa mensagem! 😊\n\n_${brandName} - Alimentação saudável em ${city}_ 🥗`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('Starting cart reminders job...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const { data: firstReminderCarts, error: firstError } = await supabase
      .from('carts').select('*').eq('status', 'active')
      .lt('last_activity_at', oneHourAgo.toISOString())
      .is('whatsapp_sent_at', null).not('items', 'eq', '[]');
    if (firstError) throw firstError;

    const { data: secondReminderCarts, error: secondError } = await supabase
      .from('carts').select('*').eq('status', 'active')
      .lt('last_activity_at', threeHoursAgo.toISOString())
      .not('whatsapp_sent_at', 'is', null).is('whatsapp_2_sent_at', null)
      .not('items', 'eq', '[]');
    if (secondError) throw secondError;

    console.log(`Found ${firstReminderCarts?.length || 0} carts for first reminder, ${secondReminderCarts?.length || 0} for second`);

    let whatsappSent = 0, whatsapp2Sent = 0;
    const errors: string[] = [];

    const cache: Record<string, { brandName: string; baseUrl: string; city: string; creds: EvolutionCredentials } | null> = {};

    async function resolveContext(tenantId: string | null) {
      const key = tenantId || '__default__';
      if (!(key in cache)) {
        const branding = await getTenantBranding(supabase, tenantId);
        const whatsappCreds = await getWhatsAppCredentials(supabase, tenantId);
        if (!whatsappCreds) { cache[key] = null; }
        else {
          cache[key] = {
            brandName: branding.brand_name,
            baseUrl: getTenantBaseUrl(branding),
            city: branding.city,
            creds: whatsappCreds,
          };
        }
      }
      return cache[key];
    }

    if (firstReminderCarts) {
      for (const cart of firstReminderCarts as AbandonedCart[]) {
        if (!cart.phone || !cart.items || cart.items.length === 0) continue;
        const ctx = await resolveContext(cart.tenant_id);
        if (!ctx) continue;

        const message = generateCartReminderMessage(cart, ctx.brandName, ctx.baseUrl, ctx.city, false);
        const result = await sendWhatsAppText(cart.phone, message, ctx.creds);
        if (result.success) {
          await supabase.from('carts').update({ whatsapp_sent_at: now.toISOString(), status: 'abandoned' }).eq('id', cart.id);
          whatsappSent++;
        } else {
          errors.push(`Failed to send WhatsApp to ${cart.phone}`);
        }
      }
    }

    if (secondReminderCarts) {
      for (const cart of secondReminderCarts as AbandonedCart[]) {
        if (!cart.phone || !cart.items || cart.items.length === 0) continue;
        const ctx = await resolveContext(cart.tenant_id);
        if (!ctx) continue;

        const message = generateCartReminderMessage(cart, ctx.brandName, ctx.baseUrl, ctx.city, true);
        const result = await sendWhatsAppText(cart.phone, message, ctx.creds);
        if (result.success) {
          await supabase.from('carts').update({ whatsapp_2_sent_at: now.toISOString() }).eq('id', cart.id);
          whatsapp2Sent++;
        } else {
          errors.push(`Failed to send second WhatsApp to ${cart.phone}`);
        }
      }
    }

    const result = { success: true, processed: { firstReminders: firstReminderCarts?.length || 0, secondReminders: secondReminderCarts?.length || 0, whatsappSent, whatsapp2Sent }, errors: errors.length > 0 ? errors : undefined };
    console.log('Cart reminders job completed:', result);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in send-cart-reminders:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
