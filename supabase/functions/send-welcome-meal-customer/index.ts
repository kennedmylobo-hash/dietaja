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
    const { customer_name, customer_phone, quantity, feedback_link, brand_name } = await req.json();

    if (!customer_phone || !customer_name) {
      throw new Error("customer_phone and customer_name are required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tenant from auth context
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
      console.log("[WELCOME] No WhatsApp credentials configured");
      return new Response(JSON.stringify({ success: false, error: "no_credentials" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const firstName = customer_name.split(" ")[0];
    const brand = brand_name || "nossa equipe";
    const feedbackLine = feedback_link
      ? `\n⭐ *Avalie suas refeições:*\n${feedback_link}\nSua avaliação semanal nos ajuda a manter a qualidade e personalizar ainda mais seu cardápio!\n`
      : '';

    const message = `Olá ${firstName}! 👋 Seja bem-vindo(a) ao plano personalizado da *${brand}*!

🍽️ Seu lote de *${quantity} marmita${quantity > 1 ? 's' : ''}* foi registrado com sucesso.

📲 *Este é o seu canal direto conosco.* A cada retirada, você receberá uma atualização com seu saldo atualizado por aqui.
${feedbackLine}
Estamos comprometidos com a qualidade do seu pedido. Qualquer dúvida ou ajuste, é só chamar! 💚`.trim();

    const result = await sendWhatsAppText(customer_phone, message, whatsappCreds);

    console.log(`[WELCOME] Sent to ${customer_phone}: ${result.success}`);

    return new Response(JSON.stringify({ success: result.success }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("[WELCOME] Error:", error);
    return new Response(JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
