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
Sua tarefa: receber uma DIETA do cliente e gerar um ORÇAMENTO DE DIETA PERSONALIZADA formatado para WhatsApp, SEMPRE SEPARADO EM 3 BLOCOS POR PROTEÍNA (FRANGO, CARNE, PEIXE), idêntico ao modelo abaixo.

⚠️ REGRA FUNDAMENTAL:
Dieta Personalizada NÃO tem relação com kits prontos. SEMPRE estruture em blocos de 10, 20 e 30 marmitas POR TIPO DE PROTEÍNA, de forma independente. O cliente combina depois (ex.: 10 frango + 10 carne + 10 peixe).

⚠️ SEMPRE GERE OS 3 BLOCOS NESTA ORDEM (mesmo que a dieta não cite alguma proteína explicitamente — monte variações compatíveis com os acompanhamentos/legumes/carbos da dieta):
1) 🍗 FRANGO
2) 🥩 CARNE
3) 🐟 PEIXE

📐 MODELO EXATO A SEGUIR (copie a estrutura, troque apenas os dados):

🥗 *${brandName || "Marmitaria"}* — ORÇAMENTO DIETA PERSONALIZADA
👤 Cliente: ${customerName}
📌 Nº ${quoteNumber || "—"}
📅 Validade: 7 dias

━━━━━━━━━━━━━━
🍗 *FRANGO*

📋 *Composição do almoço (até 5 opções):*
• Opção 01: 150g peito de frango grelhado + 150g legumes refogados + 80g arroz integral
• Opção 02: 150g frango desfiado + 150g brócolis + 80g batata doce
• Opção 03: ...
• Opção 04: ...
• Opção 05: ...

💰 *Tabela de preços:*
• 10 marmitas → R$ XX,XX/un = *R$ XXX,XX*
• 20 marmitas (5% OFF) → R$ XX,XX/un = *R$ XXX,XX*
• 30 marmitas (10% OFF) → R$ XX,XX/un = *R$ XXX,XX*

━━━━━━━━━━━━━━
🥩 *CARNE*

📋 *Composição do almoço (até 5 opções):*
• Opção 01: ...
[mesmo formato — 5 variações com acompanhamentos da dieta]

💰 *Tabela de preços:*
• 10 marmitas → R$ XX,XX/un = *R$ XXX,XX*
• 20 marmitas (5% OFF) → R$ XX,XX/un = *R$ XXX,XX*
• 30 marmitas (10% OFF) → R$ XX,XX/un = *R$ XXX,XX*

━━━━━━━━━━━━━━
🐟 *PEIXE*

📋 *Composição do almoço (até 5 opções):*
• Opção 01: ...
[mesmo formato]

💰 *Tabela de preços:*
• 10 marmitas → R$ XX,XX/un = *R$ XXX,XX*
• 20 marmitas (5% OFF) → R$ XX,XX/un = *R$ XXX,XX*
• 30 marmitas (10% OFF) → R$ XX,XX/un = *R$ XXX,XX*

━━━━━━━━━━━━━━
✅ Produzimos sob demanda — sempre fresquinho
📦 Entrega em até 3 dias úteis após confirmação
💳 Pagamento PIX ou Cartão (5% acréscimo no cartão)
🛵 Taxa de entrega: R$ 10,00 (cobrada à parte)
💡 Você pode combinar proteínas (ex.: 10 frango + 10 carne + 10 peixe)

⚠️ REGRAS DE PRODUTO (MARMITAS CONGELADAS):
- TODAS as marmitas são preparadas, CONGELADAS e enviadas. Sempre tratar como produto congelado.
- NUNCA inclua: saladas cruas, folhas verdes cruas (alface, rúcula, agrião), tomate cru, pepino cru, frutas frescas — não congelam bem.
- Se a dieta original do cliente trouxer esses itens, SUBSTITUA por equivalentes cozidos/refogados/grelhados (ex.: salada crua → legumes refogados; fruta → batata doce cozida ou purê de abóbora; tomate cru → tomate refogado).
- Sempre especifique gramas E ingrediente (ex.: "150g peito de frango grelhado + 100g arroz branco + 80g feijão carioca + 50g mix de legumes refogados").
- Cardápios com FRANGO devem custar menos que CARNE; PEIXE = preço do FRANGO + R$ 9,00 por unidade (a menos que a tabela do admin diga outra coisa).

REGRAS DE PREÇO:
- Use EXATAMENTE os preços unitários da tabela do admin (REGRAS DE PREÇO abaixo) quando fornecidos. Caso contrário, use os padrões: Frango R$ 24,90 (10un) / R$ 22,90 (20un); Carne R$ 28,90 (10un) / R$ 26,90 (20un); Peixe = Frango + R$ 9,00.
- Desconto por volume aplica em CADA proteína: 10 un = preço cheio, 20 un = 5% OFF, 30 un = 10% OFF.
- Arredonde para 2 casas, vírgula como decimal (R$ 26,90).

FORMATO:
- Texto pronto pra WhatsApp. Use *negrito* do WhatsApp. NUNCA use markdown (#, **).
- SEMPRE os 3 blocos (Frango, Carne, Peixe) na mesma ordem, mesma estrutura idêntica.
- Use os acompanhamentos/legumes/carbos da dieta enviada para montar as variações de cada bloco — substituindo crus por cozidos quando necessário.
- Separe cada grupo com uma linha de "━━━━━━━━━━━━━━".
- No rodapé reforce: "❄️ Marmitas preparadas, congeladas e enviadas — validade 90 dias no freezer."
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
