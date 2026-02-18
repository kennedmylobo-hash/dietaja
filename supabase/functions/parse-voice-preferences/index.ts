import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchAvailableIngredients() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const [flavorsRes, sidesRes] = await Promise.all([
    supabase.from("marmita_flavors").select("name, category").eq("active", true),
    supabase.from("marmita_sides").select("name, category").eq("active", true),
  ]);

  const flavors = flavorsRes.data || [];
  const sides = sidesRes.data || [];

  const proteins = flavors.map((f) => f.name);

  const carbSides = sides
    .filter((s) => s.category === "acompanhamento")
    .map((s) => s.name);

  const mixSides = sides
    .filter((s) => s.category === "salada" || s.category === "legumes" || s.category === "mix")
    .map((s) => s.name);

  // If no mix sides found from category filter, include all non-carb sides
  const finalMix = mixSides.length > 0 ? mixSides : sides
    .filter((s) => s.category !== "acompanhamento")
    .map((s) => s.name);

  return {
    proteins: proteins.length > 0 ? proteins.join(", ") : "frango, carne, peixe",
    carbs: carbSides.length > 0 ? carbSides.join(", ") : "arroz, feijão, batata doce",
    mix: finalMix.length > 0 ? finalMix.join(", ") : "legumes, salada",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    console.log("Received transcript:", transcript?.substring(0, 100));

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Transcrição muito curta ou inválida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch available ingredients from database
    const available = await fetchAvailableIngredients();
    console.log("Available ingredients:", JSON.stringify(available));

    const systemPrompt = `O usuário descreveu por áudio os ingredientes que gosta para marmitas fitness. Extraia e separe em 3 categorias: proteínas, carboidratos e mix de legumes/salada.

IMPORTANTE - INGREDIENTES DISPONÍVEIS (use APENAS estes):
Proteínas: ${available.proteins}
Carboidratos: ${available.carbs}
Mix de legumes/salada: ${available.mix}

REGRAS:
- Se o usuário mencionar ingredientes que NÃO estão na lista acima, IGNORE-OS completamente.
- Retorne APENAS ingredientes que existem na lista acima.
- Retorne cada categoria como uma string com os itens separados por vírgula.
- Se nenhum ingrediente mencionado existe na categoria, retorne string vazia.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_preferences",
              description: "Extrai as preferências alimentares separadas em 3 categorias, usando APENAS ingredientes da lista disponível.",
              parameters: {
                type: "object",
                properties: {
                  proteins: {
                    type: "string",
                    description: "Proteínas separadas por vírgula (apenas da lista disponível)",
                  },
                  carbs: {
                    type: "string",
                    description: "Carboidratos separados por vírgula (apenas da lista disponível)",
                  },
                  mix: {
                    type: "string",
                    description: "Mix de legumes/salada separados por vírgula (apenas da lista disponível)",
                  },
                },
                required: ["proteins", "carbs", "mix"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_preferences" } },
      }),
    });

    console.log("AI gateway response status:", response.status);
    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair as preferências." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        proteins: parsed.proteins || "",
        carbs: parsed.carbs || "",
        mix: parsed.mix || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-voice-preferences error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
