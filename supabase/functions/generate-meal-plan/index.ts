import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Common protein keywords to extract from dish names
const PROTEIN_KEYWORDS = [
  "frango", "carne bovina", "carne moída", "carne suína", "peixe",
  "salmão", "tilápia", "camarão", "atum", "almôndegas", "almondega",
  "estrogonofe", "strogonoff", "escondidinho", "parmegiana",
  "porco", "linguiça", "costela", "filé",
];

// Cache ingredients in memory (5 min TTL)
let cachedIngredients: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

function extractProteinKeywords(dishNames: string[]): string[] {
  const found = new Set<string>();
  for (const dish of dishNames) {
    const lower = dish.toLowerCase();
    for (const kw of PROTEIN_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        found.add(kw);
      }
    }
  }
  return found.size > 0 ? [...found] : ["frango", "carne", "peixe"];
}

async function fetchAvailableIngredients() {
  const now = Date.now();
  if (cachedIngredients && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedIngredients;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const [flavorsRes, sidesRes] = await Promise.all([
    supabase.from("marmita_flavors").select("name").eq("active", true),
    supabase.from("marmita_sides").select("name, category").eq("active", true),
  ]);

  const flavors = flavorsRes.data || [];
  const sides = sidesRes.data || [];

  const proteins = extractProteinKeywords(flavors.map((f) => f.name));

  const carbSides = [...new Set(sides
    .filter((s) => s.category === "acompanhamento")
    .map((s) => s.name))];

  const mixSides = [...new Set(sides
    .filter((s) => s.category !== "acompanhamento")
    .map((s) => s.name))];

  const result = {
    proteins: proteins.join(", "),
    carbs: carbSides.length > 0 ? carbSides.join(", ") : "arroz, feijão, batata doce",
    mix: mixSides.length > 0 ? mixSides.join(", ") : "legumes, salada",
  };

  cachedIngredients = result;
  cacheTimestamp = now;
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proteins, carbs, mix, quantity, lineType } = await req.json();

    if (!proteins || !carbs || !mix || !quantity) {
      return new Response(
        JSON.stringify({ error: "Preencha todos os campos" }),
        { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch available ingredients from database
    const available = await fetchAvailableIngredients();
    console.log("Available ingredients for meal plan:", JSON.stringify(available));

    const isFitness = lineType === "hipertrofia";
    const proteinG = isFitness ? 150 : 100;
    const carbG = isFitness ? 200 : 150;
    const mixG = isFitness ? 100 : 50;
    const totalWeight = proteinG + carbG + mixG;
    const lineName = isFitness ? "Fitness" : "Fit";

    const maxFlavors = quantity <= 7 ? 3 : quantity <= 14 ? 5 : quantity <= 21 ? 7 : 10;

    const systemPrompt = `Você é um nutricionista especialista em marmitas fitness. O cliente informou suas preferências e você deve montar um cardápio de marmitas.

REGRAS OBRIGATÓRIAS:
- Total de marmitas: ${quantity} unidades
- Máximo de sabores diferentes: ${maxFlavors}
- Cada marmita segue o padrão ${lineName}: ${proteinG}g proteína + ${carbG}g carboidrato + ${mixG}g mix de legumes/salada = ${totalWeight}g total
- Distribua as ${quantity} marmitas entre os sabores de forma equilibrada
- Dê um nome criativo e claro para cada sabor (ex: "Strogonoff com Arroz Integral e Mix de Legumes")
- A soma das quantidades de todos os sabores deve ser exatamente ${quantity}

INGREDIENTES DISPONÍVEIS NO CATÁLOGO (use APENAS estes):
Proteínas: ${available.proteins}
Carboidratos: ${available.carbs}
Mix: ${available.mix}

IMPORTANTE: Use APENAS ingredientes que existem no catálogo acima. Se o cliente mencionou ingredientes que NÃO estão no catálogo, substitua por opções similares do catálogo ou ignore-os.

PREFERÊNCIAS DO CLIENTE:
- Proteínas: ${proteins}
- Carboidratos: ${carbs}
- Mix de legumes/salada: ${mix}

Monte o cardápio usando a função suggest_meal_plan.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Monte meu cardápio de ${quantity} marmitas com os ingredientes que informei.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_meal_plan",
                description:
                  "Retorna a sugestão de cardápio com os sabores e quantidades.",
                parameters: {
                  type: "object",
                  properties: {
                    flavors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                            description: "Nome do sabor (ex: Strogonoff com Arroz Integral)",
                          },
                          protein: {
                            type: "string",
                            description: "Proteína usada",
                          },
                          carb: {
                            type: "string",
                            description: "Carboidrato usado",
                          },
                          mix: {
                            type: "string",
                            description: "Mix de legumes/salada",
                          },
                          quantity: {
                            type: "number",
                            description: "Quantidade de marmitas deste sabor",
                          },
                        },
                        required: ["name", "protein", "carb", "mix", "quantity"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["flavors"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_meal_plan" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas solicitações. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível. Tente mais tarde." }),
          { status: 402, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar cardápio. Tente novamente." }),
        { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Não foi possível gerar o cardápio. Tente novamente." }),
        { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const mealPlan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-meal-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
