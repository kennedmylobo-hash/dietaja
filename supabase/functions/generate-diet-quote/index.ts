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
Sua tarefa: receber uma DIETA do cliente (lista de refeições enviada pela nutricionista) e gerar um ORÇAMENTO DE DIETA PERSONALIZADA formatado para WhatsApp, AGRUPADO POR TIPO DE PROTEÍNA.

⚠️ REGRA FUNDAMENTAL — LEIA COM ATENÇÃO:
Dieta Personalizada NÃO TEM RELAÇÃO com pacotes/kits prontos do cardápio. NÃO mencione kits de 7, 15 ou outros números. O orçamento é SEMPRE estruturado em blocos de 10, 20 e 30 marmitas POR TIPO DE PROTEÍNA, de forma independente.
Exemplo correto: o cliente pode pedir "10 de frango + 10 de carne + 10 de peixe", ou "20 só de frango", ou "30 só de carne". Cada proteína tem sua própria tabela 10/20/30.

⚠️ ESTRUTURA OBRIGATÓRIA DO ORÇAMENTO:

1) AGRUPAMENTO POR PROTEÍNA: identifique as refeições da dieta e separe em GRUPOS por tipo de proteína detectada (ex.: "FRANGO", "CARNE BOVINA", "PEIXE", "VEGETARIANA"). Para cada grupo, monte até 5 VARIAÇÕES de almoço usando os acompanhamentos da própria dieta.

2) Para CADA grupo/proteína, monte uma seção com:
   🍗 *[NOME DA PROTEÍNA]*
   📋 *Composição do almoço (até 5 opções):*
   • Opção 01: 150g [proteína grelhada] + 150g legumes + 80g arroz/feijão
   • Opção 02: ...
   • Opção 03: ...

3) Para CADA grupo, gere SEMPRE a TABELA 10/20/30 (independente da quantidade total — o cliente escolhe depois quantos de cada quer):
   💰 *Tabela de preços ([proteína]):*
   • 10 marmitas → R$ XX,XX/un = *R$ XXX,XX*
   • 20 marmitas → R$ XX,XX/un (5% OFF) = *R$ XXX,XX*
   • 30 marmitas → R$ XX,XX/un (10% OFF) = *R$ XXX,XX*

4) Cabeçalho:
   🥗 *${brandName || "Marmitaria"}* — ORÇAMENTO DIETA PERSONALIZADA
   👤 Cliente: ${customerName}
   📅 Validade: 7 dias
   📌 Nº ${quoteNumber || "—"}

5) Rodapé fixo:
   ✅ Produzimos sob demanda — sempre fresquinho
   📦 Entrega em até 3 dias úteis após confirmação
   💳 Pagamento PIX ou Cartão (5% acréscimo no cartão)
   🛵 Taxa de entrega: R$ 10,00 (cobrada à parte)
   💡 Você pode combinar proteínas (ex.: 10 frango + 10 carne + 10 peixe)

REGRAS DE PREÇO:
- Use EXATAMENTE os preços unitários da tabela abaixo conforme a proteína de cada grupo.
- Desconto por volume aplica em CADA proteína individualmente: 10 un = preço cheio, 20 un = 5% OFF, 30 un = 10% OFF.
- NUNCA misture com lógica de kits prontos. Sempre 10/20/30 por proteína.
- Arredonde para 2 casas, vírgula como separador decimal (R$ 26,90).

FORMATO:
- Texto pronto pra colar no WhatsApp. Use *negrito* do WhatsApp. NUNCA use markdown (#, **).
- Use emojis com moderação (🥗 📋 💰 📅 👤 ✅ 📦 💳 🛵 🍗 🥩 🐟).
- Separe cada grupo com uma linha de "━━━━━━━━━━━━━━".
${pricingBlock}
${notes ? `\nObservações extras do admin: ${notes}` : ""}`;

    const userContent: any[] = [
      { type: "text", text: `Cliente: ${customerName}\n\n${dietText ? `Dieta (texto):\n${dietText}` : "Dieta enviada como imagem — extraia os itens, quantidades e proteínas da imagem."}` },
    ];
    if (dietImageBase64) {
      const dataUrl = dietImageBase64.startsWith("data:")
        ? dietImageBase64
        : `data:image/jpeg;base64,${dietImageBase64}`;
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
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
