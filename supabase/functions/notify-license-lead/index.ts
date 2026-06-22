import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, whatsapp, interesse_faturar, comprometimento, expectativa, investimento_ok } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const credentials = await getWhatsAppCredentials(supabase);
    if (!credentials) {
      console.error("WhatsApp credentials not configured");
      return new Response(JSON.stringify({ success: false, error: "WhatsApp not configured" }), {
        status: 500,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const investimentoMap: Record<string, string> = {
      sim: "✅ Tem disponível",
      parcelado: "💳 Parcelado 12x",
      organizar: "⏳ Precisa se organizar",
    };

    const interesseMap: Record<string, string> = {
      sim: "🔥 Sim, muito!",
      talvez: "🤔 Talvez",
      nao: "❌ Não tem interesse",
    };

    const comprometimentoMap: Record<string, string> = {
      sim: "💪 Comprometido(a)",
      talvez: "🤔 Precisa entender melhor",
    };

    const message = `🔔 *NOVO LEAD - LICENÇA DE MARCA*

👤 *Nome:* ${nome}
📱 *WhatsApp:* ${whatsapp}

📊 *Respostas do Quiz:*
• Interesse em faturar R$20k: ${interesseMap[interesse_faturar] || interesse_faturar}
• Comprometimento: ${comprometimentoMap[comprometimento] || comprometimento}
• Investimento: ${investimentoMap[investimento_ok] || investimento_ok}

💬 *Expectativa:*
${expectativa || "(não informou)"}

_Responda esse lead o mais rápido possível!_`;

    const ADMIN_PHONE = "77991038866";
    const result = await sendWhatsAppText(ADMIN_PHONE, message, credentials);

    console.log(`[notify-license-lead] WhatsApp sent: ${result.success}`);

    return new Response(JSON.stringify({ success: result.success }), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notify-license-lead] Error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
