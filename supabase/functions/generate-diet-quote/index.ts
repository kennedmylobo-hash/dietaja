// Generate diet quote message via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { customerName, dietText, dietImageBase64, brandName, quoteNumber, pricing, notes } = await req.json();

    if (!customerName || (!dietText && !dietImageBase64)) {
      return new Response(JSON.stringify({ error: "Informe nome do cliente e a dieta (texto ou imagem)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI indisponível." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pricingBlock = pricing
      ? `\n\nREGRAS DE PREÇO (use exatamente estes valores):\n${pricing}\n`
      : "";

    const system = `Você é assistente de uma marmitaria fitness chamada "${brandName || "Marmitaria"}".
Sua tarefa: receber uma DIETA do cliente (com lista de marmitas e quantidades) e gerar um ORÇAMENTO PERSONALIZADO em texto formatado para WhatsApp.

⚠️ REGRA CRÍTICA DE PREÇO — cada marmita tem preço DIFERENTE conforme a PROTEÍNA principal:
- Identifique a proteína de CADA marmita individualmente (frango, carne bovina/moída/almôndegas, peixe/tilápia, vegetariana etc.)
- Aplique o preço unitário correspondente da TABELA DE PREÇOS abaixo para CADA marmita
- O TOTAL do pedido = soma (preço_unitário_da_marmita × quantidade) para cada item
- NUNCA use um preço médio único — cada cliente recebe um orçamento sob medida
- Mostre na lista o preço unitário ao lado de cada item: "3x Filé de Peixe — R$ X,XX/un = R$ XX,XX"
- No final mostre subtotal, possíveis descontos por volume (5% em 20+, 10% em 30+) e TOTAL final

FORMATO:
- Use emojis simples (🥗 📋 📅 👤 ✅ 💰 📦 🍗 🥩 🐟).
- Cabeçalho com nome da marca, nº do orçamento (${quoteNumber || "—"}) e cliente: ${customerName}.
- Liste TODAS as marmitas do pedido com qtd, descrição curta, preço unitário e subtotal da linha.
- Mostre RESUMO: total de marmitas, subtotal, desconto (se aplicável), total final.
- Rodapé com: produção sob demanda, entrega em 3 dias úteis, pagamento PIX ou cartão (5% acréscimo no cartão), taxa de entrega R$ 10,00.
- Texto pronto para colar no WhatsApp. NÃO use markdown (#). Use *negrito* do WhatsApp.${pricingBlock}
${notes ? `\nObservações extras do admin: ${notes}` : ""}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Cliente: ${customerName}\n\nDieta:\n${dietText}` },
        ],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("AI error", resp.status, txt);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido, tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de AI esgotados. Adicione créditos no Lovable Cloud." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar orçamento." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const message: string = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-diet-quote error", err);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
