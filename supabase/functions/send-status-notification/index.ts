import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl, type TenantBranding } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials, getEmailCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest { order_id: string; new_status: string; }

interface OrderData {
  order_number: string; customer_name: string; customer_email: string; customer_phone: string;
  delivery_option: string; total: number; items: any[]; tracking_link: string | null;
}

interface MarketingMessage {
  whatsapp_template: string; email_subject: string; email_body_html: string; is_active: boolean;
}

const FALLBACK_MESSAGES: Record<string, { title: string; emoji: string; color: string; whatsapp: string; email_subject: string }> = {
  approved: { title: "Pagamento Confirmado!", emoji: "✅", color: "#22c55e",
    whatsapp: "✅ *Pagamento Confirmado!*\n\nOlá {nome}! Seu pedido *#{pedido}* foi aprovado.\n\n💰 Total: R$ {total}\n📦 Entrega prevista: até 3 dias úteis\n\n🔗 Acompanhe: {link}",
    email_subject: "✅ Pagamento Confirmado - Pedido #{pedido}" },
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
    email_subject: "✅ Pedido #{pedido} entregue com sucesso!" },
  cancelled: { title: "Pedido Cancelado", emoji: "❌", color: "#ef4444",
    whatsapp: "😢 *Pedido Cancelado*\n\nOlá {nome}, seu pedido *#{pedido}* foi cancelado.\n\nPrecisa de ajuda? Estamos aqui!",
    email_subject: "😢 Pedido #{pedido} cancelado" }
};

const replaceVariables = (template: string, order: OrderData, branding?: TenantBranding): string => {
  const firstName = order.customer_name.split(" ")[0];
  const baseUrl = branding ? getTenantBaseUrl(branding) : "https://dietajavca.com.br";
  const trackingUrl = `${baseUrl}/pedido/${order.order_number}`;
  const linkRastreio = order.tracking_link ? `📍 Rastreie em tempo real:\n${order.tracking_link}` : `🔗 Acompanhe seu pedido:\n${trackingUrl}`;
  return template.replace(/{nome}/g, firstName).replace(/{nome_completo}/g, order.customer_name)
    .replace(/{pedido}/g, order.order_number).replace(/{total}/g, order.total.toFixed(2).replace(".", ","))
    .replace(/{link}/g, trackingUrl).replace(/{link_rastreio}/g, linkRastreio)
    .replace(/{marca}/g, branding?.brand_name || "Dieta Já");
};

const sendWhatsAppText = async (phone: string, message: string, orderNumber: string, apiToken: string, channelToken: string) => {
  try {
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) formattedPhone = "55" + formattedPhone;
    console.log(`[TEXT] Sending WhatsApp to ${formattedPhone} for order ${orderNumber}`);
    const response = await fetch("https://api.notificame.com.br/v1/channels/whatsapp/messages", {
      method: "POST",
      headers: { "X-Api-Token": apiToken, "Content-Type": "application/json" },
      body: JSON.stringify({ from: channelToken, to: formattedPhone, contents: [{ type: "text", text: message }] }),
    });
    const result = await response.text();
    console.log(`[TEXT] NotificaMe response for order ${orderNumber}: ${response.status} - ${result}`);
  } catch (error) {
    console.error("[TEXT] Error sending WhatsApp:", error);
  }
};

const sendWhatsAppTemplate = async (phone: string, templateName: string, fields: Record<string, string>, orderNumber: string, apiToken: string, channelToken: string) => {
  try {
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) formattedPhone = "55" + formattedPhone;
    const fieldKeys = Object.keys(fields).sort((a, b) => Number(a) - Number(b));
    const parameters = fieldKeys.map(key => ({ type: "text", text: fields[key] }));
    const payload = {
      from: channelToken, to: formattedPhone,
      contents: [{ type: "template", template: { name: templateName, language: { code: "pt_BR" }, components: [{ type: "body", parameters }] } }],
    };
    const response = await fetch("https://api.notificame.com.br/v1/channels/whatsapp/messages", {
      method: "POST",
      headers: { "X-Api-Token": apiToken, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.text();
    console.log(`[TEMPLATE] NotificaMe response for order ${orderNumber}: ${response.status} - ${result}`);
  } catch (error) {
    console.error("[TEMPLATE] Error sending WhatsApp template:", error);
  }
};

const sendEmailNotification = async (
  email: string, order: OrderData, subject: string, bodyHtml: string,
  statusColor: string, branding: TenantBranding, emailApiKey: string, fromEmail: string
) => {
  const resend = new Resend(emailApiKey);
  const firstName = order.customer_name.split(" ")[0];
  const baseUrl = getTenantBaseUrl(branding);
  const trackingUrl = `${baseUrl}/pedido/${order.order_number}`;
  const brandName = branding.brand_name;
  const whatsappNum = branding.whatsapp;
  const whatsappFmt = branding.whatsapp_formatted;

  const itemsHtml = order.items.map((item: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}x</td></tr>`).join("");
  const processedBody = replaceVariables(bodyHtml, order, branding);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: ${statusColor}; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${replaceVariables(subject, order)}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${firstName}</strong>!</p>
      <div style="font-size: 16px; color: #666; margin-bottom: 25px;">${processedBody}</div>
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
      <a href="https://wa.me/${whatsappNum}" style="color: ${statusColor}; text-decoration: none; font-weight: bold;">📱 ${whatsappFmt}</a>
      <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${brandName} - Alimentação Saudável</p>
    </div>
  </div>
</body></html>`;

  try {
    const response = await resend.emails.send({
      from: `${brandName} <${fromEmail}>`,
      to: [email], subject: replaceVariables(subject, order, branding), html,
    });
    console.log(`Email sent for order ${order.order_number}:`, response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const IMMEDIATE_STATUSES = ["cancelled"];
const DEBOUNCE_STATUSES = ["preparing", "ready", "delivering", "delivered"];
const DEBOUNCE_DELAY_MS = 30000;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, new_status }: NotificationRequest = await req.json();
    if (!order_id || !new_status) {
      return new Response(JSON.stringify({ error: "order_id and new_status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[STATUS] Processing notification for order ${order_id}, status: ${new_status}`);

    if (new_status === "pending" || new_status === "whatsapp_pending") {
      return new Response(JSON.stringify({ success: true, skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (new_status === "approved") {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "handled_by_approved_function" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Debounce logic
    if (DEBOUNCE_STATUSES.includes(new_status)) {
      console.log(`[DEBOUNCE] Status ${new_status} is debounce-eligible`);
      const { data: existingPending } = await supabase
        .from("pending_notifications").select("id, status").eq("order_id", order_id).maybeSingle();

      const scheduledFor = new Date(Date.now() + DEBOUNCE_DELAY_MS).toISOString();

      if (existingPending) {
        await supabase.from("pending_notifications").update({ status: new_status, scheduled_for: scheduledFor }).eq("order_id", order_id);
        return new Response(JSON.stringify({ success: true, debounced: true, updated: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error: insertError } = await supabase
        .from("pending_notifications").insert({ order_id, status: new_status, scheduled_for: scheduledFor });

      if (!insertError) {
        return new Response(JSON.stringify({ success: true, debounced: true, queued: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Send immediately
    const { data: order, error } = await supabase
      .from("orders")
      .select("order_number, customer_name, customer_email, customer_phone, delivery_option, total, items, tracking_link, tenant_id")
      .eq("id", order_id).single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: template } = await supabase
      .from("marketing_messages").select("whatsapp_template, email_subject, email_body_html, is_active")
      .eq("message_type", `status_${new_status}`).single();

    const fallback = FALLBACK_MESSAGES[new_status];
    if (!template?.is_active && !fallback) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_template" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const branding = await getTenantBranding(supabase, order.tenant_id);
    const whatsappCreds = await getWhatsAppCredentials(supabase, order.tenant_id);
    const emailCreds = await getEmailCredentials(supabase, order.tenant_id);

    const whatsappMessage = template?.is_active
      ? replaceVariables(template.whatsapp_template, order as OrderData, branding)
      : fallback ? replaceVariables(fallback.whatsapp, order as OrderData, branding) : null;

    const emailSubject = template?.is_active ? template.email_subject : fallback?.email_subject || "";
    const emailBody = template?.is_active ? template.email_body_html : `<p>${fallback?.title}</p>`;
    const statusColor = fallback?.color || "#22c55e";

    const promises: Promise<void>[] = [];

    if (whatsappMessage && whatsappCreds) {
      promises.push(sendWhatsAppText(order.customer_phone, whatsappMessage, order.order_number, whatsappCreds.apiToken, whatsappCreds.channelToken));
    }

    promises.push(sendEmailNotification(
      order.customer_email, order as OrderData, emailSubject, emailBody,
      statusColor, branding, emailCreds.apiKey, emailCreds.fromEmail
    ));

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, order_number: order.order_number, immediate: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in send-status-notification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
