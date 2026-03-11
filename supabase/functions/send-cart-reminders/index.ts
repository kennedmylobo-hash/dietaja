import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText, randomDelay, BATCH_LIMITS, type EvolutionCredentials } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem { name: string; quantity: number; totalPrice: number; type: string; }

interface AbandonedCart {
  id: string; phone: string; name: string | null; items: CartItem[]; subtotal: number;
  created_at: string; last_activity_at: string; recovery_stage: number;
  last_recovery_at: string | null; tenant_id: string | null; status: string;
}

// Stage definitions with timing thresholds (in milliseconds from last_activity_at)
const STAGES = [
  { stage: 1, delayMs: 15 * 60 * 1000, coupon: null, discount: 0 },           // 15 min
  { stage: 2, delayMs: 24 * 60 * 60 * 1000, coupon: null, discount: 0 },       // 1 day
  { stage: 3, delayMs: 7 * 24 * 60 * 60 * 1000, coupon: 'VOLTA10', discount: 10 },   // 7 days
  { stage: 4, delayMs: 14 * 24 * 60 * 60 * 1000, coupon: 'RECOMECO10', discount: 10 }, // 14 days
  { stage: 5, delayMs: 30 * 24 * 60 * 60 * 1000, coupon: 'VOLTA20', discount: 20 },   // 30 days
];

function generateMessage(cart: AbandonedCart, stage: number, deepLink: string, couponCode: string | null): string {
  const firstName = cart.name?.split(' ')[0] || 'Cliente';

  switch (stage) {
    case 1:
      return `Seu pedido ficou salvo 😊\n\nÀs vezes a gente se distrai…\nSe ainda quiser finalizar, é só clicar aqui:\n\n🔗 ${deepLink}\n\nJá deixei tudo separado pra você.`;

    case 2:
      return `Oi ${firstName}! A semana passa rápido…\n\nQuem deixa pra decidir na hora acaba saindo da dieta.\n\nSeu kit já está montado e facilita muito a rotina.\n\nSe quiser finalizar, ainda está disponível:\n🔗 ${deepLink}`;

    case 3:
      return `Vi que você quase garantiu seu kit semana passada 👀\n\nPra te ajudar a começar essa semana organizado, deixei um cupom de 10%:\n\n🎟️ Cupom: *${couponCode}*\nVálido por 24h.\n\nFinalize aqui:\n🔗 ${deepLink}`;

    case 4:
      return `Às vezes tudo que falta é um empurrãozinho.\n\nSe sua meta ainda é melhorar a alimentação, essa pode ser a hora.\n\nAinda consigo aplicar 10% pra você hoje:\n🎟️ *${couponCode}*\n\n🔗 ${deepLink}`;

    case 5:
      return `Já faz um tempinho que você quase começou…\n\nSe ainda faz sentido organizar sua alimentação, quero te ajudar de verdade.\n\n🎁 *20% OFF* – válido somente hoje\n🎟️ *${couponCode}*\n\nDepois disso o cupom expira definitivamente.\n\n🔗 ${deepLink}`;

    default:
      return '';
  }
}

async function createAutoCoupon(
  supabase: any, tenantId: string | null, baseName: string, discount: number, cartId: string
): Promise<string> {
  // Create a unique coupon code per cart
  const suffix = cartId.slice(0, 6).toUpperCase();
  const code = `${baseName}-${suffix}`;
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Check if already exists
  const { data: existing } = await supabase
    .from('coupons')
    .select('code')
    .eq('code', code)
    .maybeSingle();

  if (existing) return code;

  await supabase.from('coupons').insert({
    code,
    description: `Cupom automático de recuperação (${discount}%)`,
    discount_type: 'percent',
    discount_value: discount,
    min_order_value: 0,
    max_uses: 1,
    max_uses_per_customer: 1,
    is_active: true,
    valid_from: new Date().toISOString(),
    valid_until: validUntil,
    tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
  });

  return code;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('Starting cart recovery drip job...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = Date.now();

    // Fetch all carts eligible for recovery (not converted, not dismissed, stage < 5, has items)
    const { data: carts, error } = await supabase
      .from('carts')
      .select('*')
      .in('status', ['active', 'abandoned'])
      .lt('recovery_stage', 5)
      .not('items', 'eq', '[]');

    if (error) throw error;
    if (!carts || carts.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${carts.length} carts to evaluate for recovery drip (max ${BATCH_LIMITS.MAX_MESSAGES_PER_RUN} per run)`);

    let sent = 0;
    const errors: string[] = [];
    let skippedDueToLimit = 0;

    const cache: Record<string, { baseUrl: string; creds: EvolutionCredentials } | null> = {};

    async function resolveContext(tenantId: string | null) {
      const key = tenantId || '__default__';
      if (!(key in cache)) {
        const branding = await getTenantBranding(supabase, tenantId);
        const whatsappCreds = await getWhatsAppCredentials(supabase, tenantId);
        if (!whatsappCreds) { cache[key] = null; }
        else {
          cache[key] = {
            baseUrl: getTenantBaseUrl(branding),
            creds: whatsappCreds,
          };
        }
      }
      return cache[key];
    }

    for (const cart of carts as AbandonedCart[]) {
      // Rate limit: stop after max messages
      if (sent >= BATCH_LIMITS.MAX_MESSAGES_PER_RUN) {
        skippedDueToLimit++;
        continue;
      }

      if (!cart.phone || !cart.items || cart.items.length === 0) continue;

      const currentStage = cart.recovery_stage || 0;
      const nextStageConfig = STAGES[currentStage]; // next stage is index = currentStage
      if (!nextStageConfig) continue;

      // Check if enough time has passed since last_activity_at
      const activityTime = new Date(cart.last_activity_at || cart.created_at).getTime();
      const elapsed = now - activityTime;

      if (elapsed < nextStageConfig.delayMs) continue;

      // For stages 2+, also ensure minimum gap from last recovery (at least 12h between messages)
      if (currentStage > 0 && cart.last_recovery_at) {
        const sinceLast = now - new Date(cart.last_recovery_at).getTime();
        if (sinceLast < 12 * 60 * 60 * 1000) continue; // 12h minimum gap
      }

      const ctx = await resolveContext(cart.tenant_id);
      if (!ctx) continue;

      const deepLink = `${ctx.baseUrl}?cart=${cart.id}`;

      // Create coupon if needed
      let couponCode: string | null = null;
      if (nextStageConfig.coupon && nextStageConfig.discount > 0) {
        couponCode = await createAutoCoupon(
          supabase, cart.tenant_id, nextStageConfig.coupon, nextStageConfig.discount, cart.id
        );
      }

      const message = generateMessage(cart, nextStageConfig.stage, deepLink, couponCode);
      if (!message) continue;

      // Throttle: wait between sends
      if (sent > 0) {
        await randomDelay();
      }

      const result = await sendWhatsAppText(cart.phone, message, ctx.creds);

      if (result.success) {
        await supabase.from('carts').update({
          recovery_stage: nextStageConfig.stage,
          last_recovery_at: new Date().toISOString(),
          status: currentStage === 0 ? 'abandoned' : cart.status,
        }).eq('id', cart.id);
        sent++;
        console.log(`✅ Stage ${nextStageConfig.stage} sent to ${cart.phone} (cart ${cart.id.slice(0, 8)}) [${sent}/${BATCH_LIMITS.MAX_MESSAGES_PER_RUN}]`);
      } else {
        errors.push(`Stage ${nextStageConfig.stage} failed for ${cart.phone}: ${result.error}`);
      }
    }

    const result = { success: true, processed: carts.length, sent, skippedDueToLimit, errors: errors.length > 0 ? errors : undefined };
    console.log('Cart recovery drip job completed:', result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-cart-reminders:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
