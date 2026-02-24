import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantBranding, getTenantBaseUrl, TenantBranding } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials, getEmailCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderData {
  id: string; order_number: string; customer_name: string; customer_email: string;
  customer_phone: string; total: number; delivered_at: string; tenant_id: string | null;
  review_reminder_count: number;
}

// 3 estágios de mensagens — cada uma com tom diferente, sem ser repetitiva
const REVIEW_MESSAGES = [
  {
    // Estágio 1: Imediato na entrega (já vai no status "delivered")
    // Estágio 2: 1 dia depois — tom de "nos ajude a melhorar"
    minDays: 1,
    targetCount: 1,
    whatsapp: `Oi {nome}! 😊

Ontem você recebeu seu pedido *#{pedido}* e queremos saber: *como foi a experiência?*

Sua opinião é o que nos guia pra acertar cada vez mais no tempero, na porção e na qualidade. Leva menos de 1 minuto:

👉 https://wa.me/{whatsapp_number}?text=Quero%20avaliar%20meu%20pedido%20{pedido}

Obrigado por fazer parte disso! 💚`,
  },
  {
    // Estágio 3: 3 dias depois — último lembrete, tom genuíno
    minDays: 3,
    targetCount: 2,
    whatsapp: `Oi {nome}, tudo bem? 👋

Sei que a correria do dia a dia é grande, mas se puder tirar 30 segundos pra nos contar sobre o pedido *#{pedido}*, vai fazer toda a diferença.

Cada feedback que recebemos vira uma melhoria real — no sabor, na embalagem, no cuidado. Sua voz importa de verdade pra gente.

👉 https://wa.me/{whatsapp_number}?text=Quero%20avaliar%20meu%20pedido%20{pedido}

Agradecemos demais! 🙏`,
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[REVIEW] Starting review reminder job...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca pedidos entregues que ainda não atingiram o máximo de lembretes (3 = entrega + 2 follow-ups)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_phone, total, delivered_at, tenant_id, review_reminder_count")
      .eq("status", "delivered")
      .not("delivered_at", "is", null)
      .lt("review_reminder_count", 3);

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) {
      console.log("[REVIEW] No eligible orders found");
      return new Response(JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Busca reviews existentes para não enviar para quem já avaliou
    const orderIds = orders.map(o => o.id);
    const { data: existingReviews } = await supabase
      .from("reviews")
      .select("order_id")
      .in("order_id", orderIds);

    const reviewedOrderIds = new Set((existingReviews || []).map(r => r.order_id));

    const now = new Date();
    let processed = 0;
    const cache: Record<string, { branding: TenantBranding; whatsappCreds: any }> = {};

    for (const order of orders) {
      try {
        // Pular se já avaliou
        if (reviewedOrderIds.has(order.id)) {
          // Marca como concluído (count=3) para não processar novamente
          await supabase.from("orders").update({ review_reminder_count: 3 }).eq("id", order.id);
          continue;
        }

        const deliveredAt = new Date(order.delivered_at);
        const daysSinceDelivery = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
        const currentCount = order.review_reminder_count || 0;

        // count=0: entrega imediata (já feita pelo send-status-notification), avança para 1
        if (currentCount === 0) {
          // Marca que a primeira mensagem (junto com "entregue") já foi enviada
          await supabase.from("orders").update({ 
            review_reminder_count: 1,
            review_requested_at: new Date().toISOString()
          }).eq("id", order.id);
          continue;
        }

        // Encontra o estágio correto baseado no count atual
        const stage = REVIEW_MESSAGES.find(s => s.targetCount === currentCount);
        if (!stage) continue;

        // Verifica se já passou tempo suficiente
        if (daysSinceDelivery < stage.minDays) continue;

        // Carrega credenciais do tenant
        const tenantKey = order.tenant_id || '__default__';
        if (!cache[tenantKey]) {
          const branding = await getTenantBranding(supabase, order.tenant_id);
          cache[tenantKey] = {
            branding,
            whatsappCreds: await getWhatsAppCredentials(supabase, order.tenant_id),
          };
        }
        const { branding, whatsappCreds } = cache[tenantKey];

        if (whatsappCreds) {
          const firstName = order.customer_name.split(" ")[0];
          const message = stage.whatsapp
            .replace(/{nome}/g, firstName)
            .replace(/{pedido}/g, order.order_number)
            .replace(/{whatsapp_number}/g, branding.whatsapp);

          await sendWhatsAppText(order.customer_phone, message, whatsappCreds);
          console.log(`[REVIEW] Sent stage ${currentCount + 1} to ${order.order_number}`);
        }

        // Atualiza o contador
        await supabase.from("orders").update({ 
          review_reminder_count: currentCount + 1 
        }).eq("id", order.id);

        processed++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[REVIEW] Error processing order ${order.order_number}:`, error);
      }
    }

    console.log(`[REVIEW] Completed. Processed: ${processed}`);
    return new Response(JSON.stringify({ success: true, processed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[REVIEW] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
