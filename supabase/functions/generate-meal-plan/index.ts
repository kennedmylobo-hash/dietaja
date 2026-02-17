import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proteins, carbs, mix, quantity, lineType } = await req.json();

    if (!proteins || !carbs || !mix || !quantity) {
      return new Response(
        JSON.stringify({ error: "Preencha todos os campos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
- Use APENAS os ingredientes que o cliente informou, não invente outros
- Dê um nome criativo e claro para cada sabor (ex: "Strogonoff com Arroz Integral e Mix de Legumes")
- A soma das quantidades de todos os sabores deve ser exatamente ${quantity}

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
                            description: "Proteína usada (100g)",
                          },
                          carb: {
                            type: "string",
                            description: "Carboidrato usado (150g)",
                          },
                          mix: {
                            type: "string",
                            description: "Mix de legumes/salada (50g)",
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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível. Tente mais tarde." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar cardápio. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Não foi possível gerar o cardápio. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mealPlan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-meal-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
