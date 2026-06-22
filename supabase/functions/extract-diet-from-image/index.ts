import { buildCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'imageBase64 obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você extrai cardápios/dietas de imagens (prints de WhatsApp, fotos de receituários, etc.).
Retorne APENAS o texto da dieta em formato numerado limpo, uma marmita por linha, no formato:

1- <quantidade>x <descrição completa com gramas de cada ingrediente>
2- ...

Exemplo de saída:
1- 3x Filé de Peixe Grelhado (100g) com Arroz (150g) e Legumes (50g)
2- 4x Frango Fit (100g) com Batata Doce (150g) e Mix de Salada (50g)

REGRAS:
- Inclua a quantidade de marmitas (ex: "3x") antes da descrição.
- Inclua as gramagens entre parênteses para CADA ingrediente (proteína, carboidrato, mix/legume).
- Se a imagem não trouxer gramagens, use o padrão 100g proteína + 150g carbo + 50g mix.
- Não adicione cabeçalho, rodapé, valor, total, emojis ou explicações. Apenas as linhas numeradas.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia a dieta desta imagem no formato pedido.' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 500;
      return new Response(JSON.stringify({ error: 'Falha ao processar imagem', detail: errText }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
