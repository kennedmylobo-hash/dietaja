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

// Horário comercial: 8h–21h (fuso do servidor, ajuste se necessário)
function isBusinessHours(): boolean {
  const now = new Date();
  // Converte para horário de Brasília (UTC-3)
  const brasiliaOffset = -3;
  const utcHour = now.getUTCHours();
  const brasiliaHour = (utcHour + brasiliaOffset + 24) % 24;
  return brasiliaHour >= 8 && brasiliaHour < 21;
}

// 2 estágios de follow-up (estágio 1 já é enviado na entrega pelo send-status-notification)
const REVIEW_MESSAGES = [
  {
    minDays: 1,
    targetCount: 1,
    whatsapp: `Oi {nome}! 😊

Ontem você recebeu seu pedido *#{pedido}* e queremos saber: *como foi a experiência?*

Sua opinião é o que nos guia pra acertar cada vez mais no tempero, na porção e na qualidade. Leva menos de 1 minuto:

👉 https://wa.me/{whatsapp_number}?text=Quero%20avaliar%20meu%20pedido%20{pedido}

Obrigado por fazer parte disso! 💚`,
  },
  {
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

    // ✅ Melhoria 4: Só envia em horário comercial (8h–21h Brasília)
    if (!isBusinessHours()) {
      console.log("[REVIEW] Outside business hours (8h-21h BRT), skipping.");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "outside_business_hours" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ Melhoria 2: Filtra apenas pedidos entregues nos últimos 7 dias (evita processar pedidos antigos)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_phone, total, delivered_at, tenant_id, review_reminder_count")
      .eq("status", "delivered")
      .not("delivered_at", "is", null)
      .gt("delivered_at", sevenDaysAgo)
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
    let skipped = 0;
    let failed = 0;
    const cache: Record<string, { branding: TenantBranding; whatsappCreds: any }> = {};

    for (const order of orders) {
      try {
        // Pular se já avaliou
        if (reviewedOrderIds.has(order.id)) {
          await supabase.from("orders").update({ review_reminder_count: 3 }).eq("id", order.id);
          skipped++;
          continue;
        }

        const deliveredAt = new Date(order.delivered_at);
        const daysSinceDelivery = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
        const currentCount = order.review_reminder_count || 0;

        // count=0: entrega imediata já feita pelo send-status-notification, avança para 1
        if (currentCount === 0) {
          await supabase.from("orders").update({ 
            review_reminder_count: 1,
            review_requested_at: new Date().toISOString()
          }).eq("id", order.id);
          continue;
        }

        // Encontra o estágio correto
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

          const result = await sendWhatsAppText(order.customer_phone, message, whatsappCreds);

          // ✅ Melhoria 3: Só incrementa se envio foi bem-sucedido
          if (!result.success) {
            console.error(`[REVIEW] ❌ Failed to send stage ${currentCount + 1} to ${order.order_number}: ${result.error}`);
            failed++;

            // ✅ Melhoria 1: Loga falha na notification_events
            await supabase.from("notification_events").insert({
              channel: "whatsapp",
              event_type: "review_reminder_failed",
              order_id: order.id,
              order_number: order.order_number,
              recipient_phone: order.customer_phone,
              tenant_id: order.tenant_id,
              template_name: `review_stage_${currentCount + 1}`,
              metadata: { error: result.error, stage: currentCount + 1 },
            });

            // NÃO incrementa o contador — vai tentar de novo na próxima execução
            continue;
          }

          console.log(`[REVIEW] ✅ Sent stage ${currentCount + 1} to ${order.order_number}`);

          // ✅ Melhoria 1: Loga sucesso na notification_events
          await supabase.from("notification_events").insert({
            channel: "whatsapp",
            event_type: "review_reminder_sent",
            order_id: order.id,
            order_number: order.order_number,
            recipient_phone: order.customer_phone,
            tenant_id: order.tenant_id,
            template_name: `review_stage_${currentCount + 1}`,
            message_id: result.messageId || null,
            metadata: { stage: currentCount + 1 },
          });
        }

        // Atualiza o contador (só chega aqui se envio foi ok)
        await supabase.from("orders").update({ 
          review_reminder_count: currentCount + 1 
        }).eq("id", order.id);

        processed++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[REVIEW] Error processing order ${order.order_number}:`, error);
        failed++;
      }
    }

    console.log(`[REVIEW] Completed. Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
    return new Response(JSON.stringify({ success: true, processed, skipped, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[REVIEW] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
