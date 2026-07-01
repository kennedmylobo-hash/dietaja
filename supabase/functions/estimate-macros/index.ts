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

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
        }),
      }
    );

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      // Fallback: retorna valor genérico baseado na categoria
      const fallbackKcal: Record<string, number> = { carnes: 400, frangos: 350, massas: 380, especiais: 360, peixes: 320, vegetariano: 280, sopas: 200 };
      return new Response(JSON.stringify({ success: true, calories: fallbackKcal[category] || 350 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { calories: null };

    return new Response(JSON.stringify({ success: true, calories: result.calories }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error in estimate-macros:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
