import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { customer_name, customer_phone, withdrawn, added, remaining, notes, feedback_link, custom_message } = await req.json();

    if (!customer_phone || !customer_name) {
      throw new Error("customer_phone and customer_name are required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tenant from auth context or default
    const authHeader = req.headers.get('Authorization');
    let tenantId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();
        tenantId = profile?.tenant_id || null;
      }
    }

    const whatsappCreds = await getWhatsAppCredentials(supabase, tenantId);
    if (!whatsappCreds) {
      console.log("[MEAL-BALANCE] No WhatsApp credentials configured");
      return new Response(JSON.stringify({ success: false, error: "no_credentials" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const firstName = customer_name.split(" ")[0];
    const notesLine = notes ? `\n📝 _${notes}_` : '';

    const feedbackLine = feedback_link
      ? `\n⭐ *Avalie suas refeições:*\n${feedback_link}\nSua opinião nos ajuda a manter a qualidade do seu pedido!\n`
      : '';

    let message: string;

    if (custom_message) {
      message = custom_message.trim();
    } else if (added) {
      // Credit added notification
      message = `Oi ${firstName}! 📦

✅ *Acréscimo registrado: +${added} marmita${added > 1 ? 's' : ''}*${notesLine}

🍽️ *Saldo atual: ${remaining} marmita${remaining !== 1 ? 's' : ''}*
${feedbackLine}
Qualquer dúvida, estamos à disposição! 💚`.trim();
    } else {
      // Withdrawal notification
      message = `Oi ${firstName}! 📦

Retirada registrada: *${withdrawn} marmita${withdrawn > 1 ? 's' : ''}*${notesLine}

🍽️ *Saldo atual: ${remaining} marmita${remaining !== 1 ? 's' : ''}*
${feedbackLine}
${remaining <= 5 && remaining > 0 ? '⚠️ Seu saldo está acabando! Fale conosco para renovar.' : ''}
${remaining === 0 ? '🔄 Seu saldo zerou! Entre em contato para fazer um novo pedido.' : ''}
Qualquer dúvida, estamos à disposição! 💚`.trim();
    }

    const result = await sendWhatsAppText(customer_phone, message, whatsappCreds);

    console.log(`[MEAL-BALANCE] Sent to ${customer_phone}: ${result.success}`);

    return new Response(JSON.stringify({ success: result.success }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("[MEAL-BALANCE] Error:", error);
    return new Response(JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
