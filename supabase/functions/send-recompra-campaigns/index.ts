import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl, TenantBranding } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials, getEmailCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderData {
  id: string; order_number: string; customer_name: string; customer_email: string;
  customer_phone: string; total: number; delivered_at: string; items: any[]; tenant_id: string | null;
}

interface CampaignTemplate {
  message_type: string; whatsapp_template: string; email_subject: string; email_body_html: string;
  delay_days: number; trigger_quantity: number; coupon_code: string | null; discount_percent: number | null; is_active: boolean;
}

const replaceVariables = (template: string, order: OrderData, coupon: string | null, discount: number | null, baseUrl: string): string => {
  const firstName = order.customer_name.split(" ")[0];
  return template.replace(/{nome}/g, firstName).replace(/{nome_completo}/g, order.customer_name)
    .replace(/{pedido}/g, order.order_number).replace(/{total}/g, order.total.toFixed(2).replace(".", ","))
    .replace(/{link}/g, baseUrl).replace(/{cupom}/g, coupon || "").replace(/{desconto}/g, String(discount || 0));
};

const getTotalMarmitas = (items: any[]): number => {
  let total = 0;
  for (const item of items) {
    if (item.type === 'marmita' || item.name?.toLowerCase().includes('marmita')) total += item.quantity || 1;
  }
  return total;
};

const sendEmailNotification = async (
  email: string, order: OrderData, subject: string, bodyHtml: string,
  coupon: string | null, discount: number | null,
  branding: TenantBranding, baseUrl: string, emailApiKey: string, fromEmail: string
) => {
  const resend = new Resend(emailApiKey);
  const firstName = order.customer_name.split(" ")[0];

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">🎁</div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Cupom Especial para Você!</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Olá <strong>${firstName}</strong>!</p>
      <div style="font-size: 16px; color: #666; margin-bottom: 25px;">${replaceVariables(bodyHtml, order, coupon, discount, baseUrl)}</div>
      ${coupon ? `<div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px dashed #f59e0b; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: bold;">SEU CUPOM DE DESCONTO</p>
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #b45309; letter-spacing: 4px;">${coupon}</p>
        <p style="margin: 15px 0 0 0; color: #92400e; font-size: 18px; font-weight: bold;">${discount}% OFF</p>
      </div>` : ''}
      <div style="text-align: center;">
        <a href="${baseUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">🥗 Fazer Novo Pedido</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Dúvidas? Fale conosco pelo WhatsApp</p>
      <a href="https://wa.me/${branding.whatsapp}" style="color: #ec4899; text-decoration: none; font-weight: bold;">📱 ${branding.whatsapp_formatted}</a>
      <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${branding.brand_name} - Alimentação Saudável</p>
    </div>
  </div>
</body></html>`;

  try {
    const response = await resend.emails.send({
      from: `${branding.brand_name} <${fromEmail}>`,
      to: [email], subject: replaceVariables(subject, order, coupon, discount, baseUrl), html,
    });
    console.log(`Email recompra sent for order ${order.order_number}:`, response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("Starting recompra campaigns job...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: templates, error: templateError } = await supabase
      .from("marketing_messages").select("*").like("message_type", "recompra_%").eq("is_active", true);
    if (templateError) throw templateError;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, reason: "no_templates" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalProcessed = 0;
    const cache: Record<string, { branding: TenantBranding; baseUrl: string; whatsappCreds: any; emailCreds: any }> = {};

    for (const template of templates as CampaignTemplate[]) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - template.delay_days);

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, customer_phone, total, delivered_at, items, tenant_id")
        .eq("status", "delivered").not("delivered_at", "is", null)
        .lte("delivered_at", cutoffDate.toISOString());
      if (ordersError || !orders || orders.length === 0) continue;

      const { data: sentCampaigns } = await supabase
        .from("recompra_campaigns").select("order_id").eq("message_type", template.message_type);
      const sentOrderIds = new Set((sentCampaigns || []).map(c => c.order_id));

      for (const order of orders) {
        if (sentOrderIds.has(order.id)) continue;
        const totalMarmitas = getTotalMarmitas(order.items || []);
        let matches = false;
        if (template.message_type === 'recompra_5' && totalMarmitas >= 5 && totalMarmitas < 14) matches = true;
        else if (template.message_type === 'recompra_14' && totalMarmitas >= 14 && totalMarmitas < 28) matches = true;
        else if (template.message_type === 'recompra_28' && totalMarmitas >= 28) matches = true;
        if (!matches) continue;

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
            const whatsappMessage = replaceVariables(template.whatsapp_template, order as OrderData, template.coupon_code, template.discount_percent, baseUrl);
            await sendWhatsAppText(order.customer_phone, whatsappMessage, whatsappCreds);
          }

          await sendEmailNotification(order.customer_email, order as OrderData, template.email_subject, template.email_body_html,
            template.coupon_code, template.discount_percent, branding, baseUrl, emailCreds.apiKey, emailCreds.fromEmail);

          await supabase.from("recompra_campaigns").insert({ order_id: order.id, message_type: template.message_type });
          totalProcessed++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing order ${order.order_number}:`, error);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in send-recompra-campaigns:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
