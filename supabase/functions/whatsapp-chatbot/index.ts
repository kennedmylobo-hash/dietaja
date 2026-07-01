import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatbotRequest {
  customerPhone: string;
  customerMessage: string;
  instanceName: string;
  tenantId?: string;
}

const systemPrompt = `Você é a *Ana*, consultora de nutrição e vendas da "Dieta Já" em Vitória da Conquista - BA. 

SUA PERSONALIDADE:
- Você é uma pessoa REAL, não um robô. Uma consultora atenciosa que ama ajudar as pessoas a se alimentarem melhor
- Fala como uma pessoa de verdade: "oiee", "ah, entendi!", "olha só que legal!", "super recomendo!"
- Usa emojis com moderação (🙂 👍 😋 🥗 💚)
- É calorenta, educada e faz perguntas para entender o cliente
- NUNCA parece scriptada ou robótica

SEU ÚNICO E PRINCIPAL OBJETIVO: CONVERTER VENDAS 🎯
TUDO que você faz deve levar a uma venda. Mas sem ser chata. Você educa, explica, tira dúvidas, e naturalmente conduz pra compra.

COMO CONVERTER SEM SER CHATA:
- Explique TUDO com entusiasmo: "nossas marmitas FIT são preparadas com ingredientes selecionados, cada uma tem 300g com bastante proteína pra manter sua saciedade 😋"
- Quando o cliente perguntar algo, responda COMPLETO e já emende uma sugestão: "Sim, entregamos sim! Aliás, estamos com uma promoção no pacote de 14 marmitas..."
- Faça perguntas estratégicas: "Qual seu objetivo?" "Prefere frango ou carne?" "Já pensou em experimentar nossos kits detox?"
- Se o cliente estiver indeciso, AJUDE a decidir: "Olha, pra quem quer emagrecer eu super recomendo começar com o pacote FIT de 7 marmitas pra experimentar os sabores"
- Use PROVAS SOCIAIS: "muita gente está pedindo esse sabor", "é o mais vendido da semana", "os clientes amam"
- Crie URGÊNCIA quando fizer sentido: "essa promoção é por tempo limitado"
- SEMPRE deixar uma porta aberta: "quer que eu monte um combo pra você?", "posso te ajudar a escolher?"

DIETA PERSONALIZADA 🥗:
- Esse é UM DOS NOSSOS PRINCIPAIS PRODUTOS! VENDA ATIVAMENTE!
- Quando alguém demonstrar interesse, EXPLIQUE COM VONTADE:
  * "A gente monta um cardápio sob medida! Você pode mandar FOTO de uma dieta que já segue, ou só me falar suas preferências por texto mesmo"
  * "Nossa equipe prepara TUDO e você só aquece e come. Mesmo preço das marmitas normais!"
- PERGUNTE PRA QUALIFICAR: "Qual seu objetivo? Tem restrição alimentar? Prefere frango, carne ou peixe?"
- Se o cliente disser SIM, peça NOME e fale que um consultor vai chamar no WhatsApp
- OFEREÇA ATIVAMENTE: "Sabia que temos dieta personalizada pelo mesmo preço?"

EXPLICAÇÕES TÉCNICAS QUE VOCÊ DEVE SABER:

SOBRE AS MARMITAS:
- FIT (300g, ~350kcal): para emagrecimento, menos gordura, mais fibras
- FITNESS (400g, ~420kcal): para ganho de massa, mais proteína e carbo
- Acompanhamentos variam: arroz integral/branco, feijão, batata doce, legumes, salada
- Congeladas, duram até 90 dias, é só aquecer no micro-ondas 3min ou fogão

SOBRE PACOTES:
- 7 unidades: ideal pra experimentar (R$ X/unidade)
- 14 unidades: mais popular, melhor custo-benefício
- 28 unidades: pra quem quer estoque completo
- Linha FIT e FITNESS em todos os tamanhos

SOBRE KITS DETOX:
- 3, 5 e 7 dias com sucos detox + sopas funcionais
- Perfeito pra desintoxicar, desinchar, começar uma reeducação

SOBRE ENTREGA:
- Programada: segunda, quarta e sexta
- Vitória da Conquista - BA
- Frete grátis acima de R$ 290
- Pedido mínimo: 7 unidades

SOBRE PAGAMENTO:
- PIX (aprovado na hora)
- Cartão de crédito
- WhatsApp

REGRAS DE OURO:
- Responda em português natural, como conversa de WhatsApp
- Explique TUDO em detalhes quando perguntarem (não seja curta)
- MAS sempre no final puxe pra venda: "quer experimentar?", "posso montar um combo?"
- Se não souber, transfira pra atendente
- Se o cliente estiver bravo, peça desculpas e transfira`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const data: ChatbotRequest = await req.json();
    const { customerPhone, customerMessage, instanceName, tenantId } = data;

    if (!customerPhone || !customerMessage || !instanceName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const effectiveTenantId = tenantId || "00000000-0000-0000-0000-000000000001";

    // === 1. SAVE customer message ===
    await supabase.from("chat_messages").insert({
      tenant_id: effectiveTenantId,
      customer_phone: customerPhone,
      role: "user",
      content: customerMessage,
    }).catch(e => console.error("Error saving user msg:", e));

    // === 2. FETCH conversation history (last 10 messages) ===
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("customer_phone", customerPhone)
      .order("created_at", { ascending: false })
      .limit(10);

    // === 3. BUILD messages array with history + menu context ===
    const { data: flavors } = await supabase
      .from("marmita_flavors")
      .select("name, category, calories, protein_g, price_override_fit, price_override_fitness")
      .eq("active", true)
      .order("sort_order");

    const { data: packages } = await supabase
      .from("marmita_packages")
      .select("name, quantity, unit_price, line_type, description")
      .eq("active", true)
      .order("sort_order");

    const menuContext = flavors?.length ? 
      `Cardápio disponível (${flavors.length} sabores):\n` +
      flavors.slice(0, 15).map(f => 
        `- ${f.name} (${f.category}): R$ ${(f.price_override_fit || 19.90).toFixed(2)} FIT / R$ ${(f.price_override_fitness || 24.90).toFixed(2)} FITNESS`
      ).join("\n") +
      (flavors.length > 15 ? `\n...e mais ${flavors.length - 15} sabores.` : "") +
      (packages?.length ? `\n\nPacotes: ${packages.map(p => `${p.name} (${p.quantity} unid.) - R$ ${p.unit_price.toFixed(2)}/un`).join(" | ")}` : "")
      : "";

    // Build chat messages in chronological order (oldest first)
    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `CARDÁPIO ATUAL:\n${menuContext}` },
    ];

    if (history?.length) {
      // Reverse history to chronological order
      const sorted = history.reverse();
      for (const msg of sorted) {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    } else {
      chatMessages.push({ role: "user", content: customerMessage });
    }

    // === 4. CALL AI (Gemini direto) ===
    const systemMsg = chatMessages.find(m => m.role === "system")?.content || "";
    const historyMsgs = chatMessages.filter(m => m.role !== "system");
    const lastUserMsg = historyMsgs.filter(m => m.role === "user").pop()?.content || customerMessage;

    const geminiBody = {
      contents: [{ role: "user", parts: [{ text: lastUserMsg }] }],
      systemInstruction: { parts: [{ text: systemMsg }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    };

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      const reply = "😊 Oie! No momento estou offline para novas perguntas, mas um atendente humano vai te responder em breve! 💚";
      const fallbackPhone = customerPhone.startsWith("55") ? customerPhone : `55${customerPhone}`;
      await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
        method: "POST", headers: { "apikey": evolutionApiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ number: fallbackPhone, text: reply }),
      }).catch(() => {});
      return new Response(JSON.stringify({ success: true, fallback: true, reply }), { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    // === 5. SAVE AI response ===
    await supabase.from("chat_messages").insert({
      tenant_id: effectiveTenantId,
      customer_phone: customerPhone,
      role: "assistant",
      content: reply,
    }).catch(e => console.error("Error saving assistant msg:", e));

    // === 6. AUTO-REGISTER diet request if interested ===
    const dietKeywords = ["dieta personalizada", "dieta personalizado", "cardápio personalizado", "montar meu cardápio", "montar minha dieta", "quero uma dieta", "fazer uma dieta", "dieta do meu jeito"];
    const lowerMsg = customerMessage.toLowerCase();
    const lowerReply = reply.toLowerCase();
    const interestedInDiet = dietKeywords.some(k => lowerMsg.includes(k) || lowerReply.includes(k));

    if (interestedInDiet) {
      const { data: existingRequests } = await supabase
        .from("diet_requests")
        .select("id")
        .eq("customer_phone", customerPhone)
        .in("status", ["pending", "contacted", "in_progress"])
        .limit(1);

      if (!existingRequests?.length) {
        await supabase.from("diet_requests").insert({
          tenant_id: effectiveTenantId,
          customer_name: customerPhone,
          customer_phone: customerPhone,
          goal: "emagrecer",
          preferences: `Interesse demonstrado via WhatsApp. Última msg: ${customerMessage.substring(0, 200)}`,
          status: "pending",
        }).catch(e => console.error("Error auto-registering diet request:", e));
        console.log(`[CHATBOT] Auto-registered diet request for ${customerPhone}`);
      }
    }

    // === 7. SEND via Evolution API ===
    const formattedPhone = customerPhone.startsWith("55") ? customerPhone : `55${customerPhone}`;
    await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "apikey": evolutionApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: formattedPhone, text: reply }),
    }).catch(e => console.error("Failed to send WhatsApp response:", e));

    return new Response(JSON.stringify({ 
      success: true, 
      reply,
      history_used: !!history?.length,
      history_count: history?.length || 0,
      diet_request_created: interestedInDiet,
    }), { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error in whatsapp-chatbot:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
