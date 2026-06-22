import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, category } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Nome do prato é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Estime APENAS as calorias aproximadas (kcal) para uma marmita de 300g do prato: "${name}" (categoria: ${category || "desconhecida"}).

Retorne APENAS um JSON: {"calories": NUMERO}

Regras:
- Marmita FIT ~300g: 300-420 kcal
- Sopas: 150-220 kcal
- Peixes: 280-380 kcal
- Massas: 360-430 kcal
- Vegetariano: 240-310 kcal
- FITNESS (mais proteína): 350-450 kcal

Exemplos:
- Frango Grelhado: {"calories": 350}
- Sopa de Abóbora: {"calories": 180}
- Lasanha: {"calories": 430}
- Salmão: {"calories": 380}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      return new Response(JSON.stringify({ error: "AI API error", details: err }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResponse.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "{}";

    // Extract JSON from response (removing markdown code blocks if present)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { calories: null };

    return new Response(JSON.stringify({ success: true, calories: result.calories }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error in estimate-macros:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
