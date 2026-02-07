import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl, TenantBranding } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials, getEmailCredentials } from "../_shared/tenant-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderData {
  id: string; order_number: string; customer_name: string; customer_email: string;
  customer_phone: string; total: number; delivered_at: string; tenant_id: string | null;
}

const replaceVariables = (template: string, order: OrderData, baseUrl: string): string => {
  const firstName = order.customer_name.split(" ")[0];
  const trackingUrl = `${baseUrl}/pedido/${order.order_number}`;
  return template
    .replace(/{nome}/g, firstName).replace(/{nome_completo}/g, order.customer_name)
    .replace(/{pedido}/g, order.order_number).replace(/{total}/g, order.total.toFixed(2).replace(".", ","))
    .replace(/{link}/g, trackingUrl);
};

const sendWhatsAppNotification = async (phone: string, message: string, orderNumber: string, apiToken: string, channelToken: string) => {
  try {
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) formattedPhone = "55" + formattedPhone;

    const response = await fetch("https://api.notificame.com.br/v1/channels/whatsapp/messages", {
      method: "POST",
      headers: { "X-Api-Token": apiToken, "Content-Type": "application/json" },
      body: JSON.stringify({ from: channelToken, to: formattedPhone, contents: [{ type: "text", text: message }] }),
    });
    const result = await response.text();
    console.log(`NotificaMe review response for order ${orderNumber}: ${response.status} - ${result}`);
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
  }
};

const sendEmailNotification = async (email: string, order: OrderData, subject: string, bodyHtml: string, branding: TenantBranding, baseUrl: string, emailApiKey: string, fromEmail: string) => {
  const resend = new Resend(emailApiKey);
  const firstName = order.customer_name.split(" ")[0];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #f59e0b, #eab308); padding: 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">⭐</div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Como foi sua experiência?</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${firstName}</strong>!</p>
      <div style="font-size: 16px; color: #666; margin-bottom: 25px;">${replaceVariables(bodyHtml, order, baseUrl)}</div>
      <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">Pedido</p>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #b45309;">#${order.order_number}</p>
      </div>
      <div style="text-align: center; margin-bottom: 25px;">
        <p style="color: #666; margin-bottom: 15px;">Avalie de 1 a 5 estrelas:</p>
        <div style="font-size: 32px; letter-spacing: 8px;">⭐⭐⭐⭐⭐</div>
      </div>
      <div style="text-align: center;">
        <a href="https://wa.me/${branding.whatsapp}?text=Olá! Quero avaliar meu pedido ${order.order_number}" style="display: inline-block; background: #22c55e; color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">💬 Enviar Avaliação pelo WhatsApp</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Sua opinião é muito importante para nós! 💚</p>
      <p style="margin: 0; color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${branding.brand_name} - Alimentação Saudável</p>
    </div>
  </div>
</body></html>`;

  try {
    const response = await resend.emails.send({
      from: `${branding.brand_name} <${fromEmail}>`,
      to: [email], subject: replaceVariables(subject, order, baseUrl), html,
    });
    console.log(`Email review request sent for order ${order.order_number}:`, response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("Starting review request job...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: template, error: templateError } = await supabase
      .from("marketing_messages").select("*").eq("message_type", "review_request").single();

    if (templateError || !template?.is_active) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "template_inactive" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const delayDays = template.delay_days || 1;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - delayDays);

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_phone, total, delivered_at, tenant_id")
      .eq("status", "delivered").is("review_requested_at", null)
      .not("delivered_at", "is", null).lte("delivered_at", cutoffDate.toISOString());

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Found ${orders.length} orders eligible for review request`);
    let processed = 0;

    // Cache per tenant
    const cache: Record<string, { branding: TenantBranding; baseUrl: string; whatsappCreds: any; emailCreds: any }> = {};

    for (const order of orders) {
      try {
        const tenantKey = order.tenant_id || '__default__';
        if (!cache[tenantKey]) {
          const b = await getTenantBranding(supabase, order.tenant_id);
          cache[tenantKey] = {
            branding: b, baseUrl: getTenantBaseUrl(b),
            whatsappCreds: await getWhatsAppCredentials(supabase, order.tenant_id),
            emailCreds: await getEmailCredentials(supabase, order.tenant_id),
          };
        }
        const { branding, baseUrl, whatsappCreds, emailCreds } = cache[tenantKey];

        if (whatsappCreds) {
          const whatsappMessage = replaceVariables(template.whatsapp_template, order as OrderData, baseUrl);
          await sendWhatsAppNotification(order.customer_phone, whatsappMessage, order.order_number, whatsappCreds.apiToken, whatsappCreds.channelToken);
        }

        await sendEmailNotification(order.customer_email, order as OrderData, template.email_subject, template.email_body_html, branding, baseUrl, emailCreds.apiKey, emailCreds.fromEmail);

        await supabase.from("orders").update({ review_requested_at: new Date().toISOString() }).eq("id", order.id);
        processed++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing order ${order.order_number}:`, error);
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in send-review-request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
