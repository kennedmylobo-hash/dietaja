import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText, randomDelay, BATCH_LIMITS, type EvolutionCredentials } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error('tenant_id is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tenant branding & WhatsApp credentials
    const branding = await getTenantBranding(supabase, tenant_id);
    const whatsappCreds = await getWhatsAppCredentials(supabase, tenant_id);
    if (!whatsappCreds) {
      return new Response(JSON.stringify({ error: 'WhatsApp não configurado para este tenant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = getTenantBaseUrl(branding);

    // Fetch abandoned/active carts that haven't received recovery yet
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: carts, error: cartsError } = await supabase
      .from('carts')
      .select('*')
      .eq('tenant_id', tenant_id)
      .in('status', ['active', 'abandoned'])
      .lt('last_activity_at', thirtyMinAgo)
      .is('recovery_sent_at', null)
      .not('items', 'eq', '[]');

    if (cartsError) throw cartsError;

    console.log(`[send-cart-recovery] Found ${carts?.length || 0} carts to recover (max ${BATCH_LIMITS.MAX_MESSAGES_PER_RUN} per run)`);

    let sent = 0;
    const errors: string[] = [];

    for (const cart of (carts || [])) {
      // Rate limit: stop after max messages
      if (sent >= BATCH_LIMITS.MAX_MESSAGES_PER_RUN) break;

      if (!cart.phone || !cart.items || !Array.isArray(cart.items) || cart.items.length === 0) continue;

      const firstName = cart.name?.split(' ')[0] || 'cliente';
      const deepLink = `${baseUrl}?cart=${cart.id}`;

      const message = `🍽️ Seu pedido ainda está salvo!\n\nVi que você montou seu kit, mas não finalizou.\n\nDeixei tudo separado aqui pra você 👇\nClique e finalize em menos de 1 minuto:\n\n🔗 ${deepLink}\n\nComece a semana organizada, com tudo pesado e pronto.\n\nPosso confirmar para você?`;

      // Throttle: wait between sends
      if (sent > 0) {
        await randomDelay();
      }

      const result = await sendWhatsAppText(cart.phone, message, whatsappCreds);

      if (result.success) {
        await supabase
          .from('carts')
          .update({ recovery_sent_at: new Date().toISOString() })
          .eq('id', cart.id);
        sent++;
      } else {
        errors.push(`Failed: ${cart.phone} - ${result.error}`);
      }
    }

    const response = {
      success: true,
      total: carts?.length || 0,
      sent,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('[send-cart-recovery] Result:', response);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-cart-recovery] Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
