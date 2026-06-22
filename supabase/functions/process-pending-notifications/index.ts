import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl, TenantBranding } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials, getEmailCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingNotification { id: string; order_id: string; status: string; scheduled_for: string; }

interface OrderData {
  order_number: string; customer_name: string; customer_email: string; customer_phone: string;
  delivery_option: string; total: number; items: any[]; tracking_link: string | null; tenant_id: string | null;
}

const STATUS_MESSAGES: Record<string, { title: string; emoji: string; color: string; whatsapp: string; email_subject: string }> = {
  preparing: { title: "Em Produção!", emoji: "👨‍🍳", color: "#3b82f6",
    whatsapp: "👨‍🍳 *Em Produção!*\n\nOlá {nome}! Seu pedido *#{pedido}* está sendo preparado!\n\n🔗 Acompanhe: {link}",
    email_subject: "👨‍🍳 Seu pedido #{pedido} está sendo preparado!" },
  ready: { title: "Pedido Pronto!", emoji: "📦", color: "#8b5cf6",
    whatsapp: "📦 *Pedido Pronto!*\n\nOlá {nome}! Seu pedido *#{pedido}* está prontinho!\n\n🔗 Acompanhe: {link}",
    email_subject: "📦 Seu pedido #{pedido} está pronto!" },
  delivering: { title: "Saiu para Entrega!", emoji: "🛵", color: "#f59e0b",
    whatsapp: "🛵 *Saiu para Entrega!*\n\nOlá {nome}! Seu pedido *#{pedido}* está a caminho!\n\n{link_rastreio}\n\n⚠️ *Atenção:* A entrega é realizada por parceiros (iFood, 99 ou Uber). Acompanhe o rastreio e confirme se o endereço está correto!",
    email_subject: "🛵 Seu pedido #{pedido} saiu para entrega!" },
  delivered: { title: "Pedido Entregue!", emoji: "🎉", color: "#10b981",
    whatsapp: "✅ *Pedido Entregue!*\n\nOlá {nome}! Seu pedido *#{pedido}* foi entregue.\n\nBom apetite! 🍽️",
    email_subject: "✅ Pedido #{pedido} entregue com sucesso!" }
};

const replaceVariables = (template: string, order: OrderData, baseUrl: string): string => {
  const firstName = order.customer_name.split(" ")[0];
  const trackingUrl = `${baseUrl}/pedido/${order.order_number}`;
  const linkRastreio = order.tracking_link ? `📍 Rastreie em tempo real:\n${order.tracking_link}` : `🔗 Acompanhe seu pedido:\n${trackingUrl}`;
  return template.replace(/{nome}/g, firstName).replace(/{nome_completo}/g, order.customer_name)
    .replace(/{pedido}/g, order.order_number).replace(/{total}/g, order.total.toFixed(2).replace(".", ","))
    .replace(/{link}/g, trackingUrl).replace(/{link_rastreio}/g, linkRastreio);
};

const sendEmailNotification = async (
  email: string, order: OrderData, subject: string, statusColor: string,
  statusTitle: string, branding: TenantBranding, baseUrl: string, emailApiKey: string, fromEmail: string
) => {
  const resend = new Resend(emailApiKey);
  const firstName = order.customer_name.split(" ")[0];
  const trackingUrl = `${baseUrl}/pedido/${order.order_number}`;

  const itemsHtml = order.items.map((item: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}x</td></tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: ${statusColor}; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0; font-size: 24px;">${statusTitle}</h1></div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${firstName}</strong>!</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Número do Pedido</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${statusColor};">#${order.order_number}</p>
      </div>
      <div style="margin-bottom: 25px;">
        <h3 style="color: #333; margin-bottom: 15px;">Itens do Pedido</h3>
        <table style="width: 100%; border-collapse: collapse;">${itemsHtml}</table>
        <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #eee;">
          <span style="font-size: 18px; font-weight: bold; color: ${statusColor};">Total: R$ ${order.total.toFixed(2).replace(".", ",")}</span>
        </div>
      </div>
      ${order.tracking_link ? `<div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">📍 Rastreie sua entrega em tempo real:</p>
        <a href="${order.tracking_link}" style="color: #d97706; word-break: break-all; font-size: 14px;">${order.tracking_link}</a>
      </div>` : ''}
      <div style="text-align: center;">
        <a href="${trackingUrl}" style="display: inline-block; background: ${statusColor}; color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">📦 Acompanhar Pedido</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Dúvidas? Fale conosco pelo WhatsApp</p>
      <a href="https://wa.me/${branding.whatsapp}" style="color: ${statusColor}; text-decoration: none; font-weight: bold;">📱 ${branding.whatsapp_formatted}</a>
    </div>
  </div>
</body></html>`;

  try {
    const response = await resend.emails.send({
      from: `${branding.brand_name} <${fromEmail}>`,
      to: [email], subject: replaceVariables(subject, order, baseUrl), html,
    });
    console.log(`[PROCESS] Email sent for order ${order.order_number}:`, response);
  } catch (error) {
    console.error("[PROCESS] Error sending email:", error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[PROCESS] Starting pending notifications processor...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("pending_notifications").select("*").lte("scheduled_for", new Date().toISOString());

    if (fetchError) return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    console.log(`[PROCESS] Found ${pendingNotifications.length} pending notifications`);
    let processedCount = 0;
    const errors: string[] = [];
    const cache: Record<string, { branding: TenantBranding; baseUrl: string; whatsappCreds: any; emailCreds: any }> = {};

    for (const notification of pendingNotifications as PendingNotification[]) {
      try {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("order_number, customer_name, customer_email, customer_phone, delivery_option, total, items, tracking_link, tenant_id")
          .eq("id", notification.order_id).single();

        if (orderError || !order) { await supabase.from("pending_notifications").delete().eq("id", notification.id); continue; }

        const statusConfig = STATUS_MESSAGES[notification.status];
        if (!statusConfig) { await supabase.from("pending_notifications").delete().eq("id", notification.id); continue; }

        const tenantKey = order.tenant_id || '__default__';
        if (!cache[tenantKey]) {
          const branding = await getTenantBranding(supabase, order.tenant_id);
          cache[tenantKey] = {
            branding, baseUrl: getTenantBaseUrl(branding),
            whatsappCreds: await getWhatsAppCredentials(supabase, order.tenant_id),
            emailCreds: await getEmailCredentials(supabase, order.tenant_id),
          };
        }
        const { branding, baseUrl, whatsappCreds, emailCreds } = cache[tenantKey];

        if (notification.status === "delivered") {
          await supabase.from("orders").update({ delivered_at: new Date().toISOString() }).eq("id", notification.order_id);
        }

        if (whatsappCreds) {
          const whatsappMessage = replaceVariables(statusConfig.whatsapp, order as OrderData, baseUrl);
          await sendWhatsAppText(order.customer_phone, whatsappMessage, whatsappCreds);
        }

        await sendEmailNotification(order.customer_email, order as OrderData, statusConfig.email_subject,
          statusConfig.color, statusConfig.title, branding, baseUrl, emailCreds.apiKey, emailCreds.fromEmail);

        await supabase.from("pending_notifications").delete().eq("id", notification.id);
        processedCount++;
      } catch (error) {
        console.error(`[PROCESS] Error processing notification ${notification.id}:`, error);
        errors.push(`${notification.id}: ${error}`);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[PROCESS] Fatal error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
