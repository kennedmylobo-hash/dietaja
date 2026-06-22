import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { currentContent, targetSection } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sectionLabels: Record<string, string> = {
      hero_title: "título principal do Hero",
      hero_subtitle: "subtítulo do Hero",
      hero_cta: "texto do botão CTA do Hero",
      hero_title_highlight: "destaque do título do Hero",
    };

    const sectionLabel = sectionLabels[targetSection] || targetSection;

    const systemPrompt = `Você é um especialista em copywriting de conversão para o nicho de alimentação saudável e marmitas fit.
Seu objetivo é gerar uma variante otimizada para teste A/B que aumente a taxa de conversão.

Regras:
- Mantenha o mesmo tamanho aproximado do texto original (máximo 20% mais longo)
- Use gatilhos mentais: urgência, prova social, benefício direto, escassez
- Seja persuasivo mas autêntico, sem exageros
- Foque no benefício principal para o cliente
- Use linguagem informal e próxima do público brasileiro
- NÃO use aspas no texto gerado
- Retorne APENAS o texto otimizado, sem explicações`;

    const userPrompt = `Gere uma variante otimizada do ${sectionLabel} para teste A/B.

Texto atual: "${currentContent}"

Retorne APENAS o novo texto otimizado, nada mais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao gerar variante com IA");
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) throw new Error("IA não retornou texto");

    return new Response(JSON.stringify({ generatedText }), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ab-variant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
