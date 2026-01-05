import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total: number;
  delivered_at: string;
  items: any[];
}

interface CampaignTemplate {
  message_type: string;
  whatsapp_template: string;
  email_subject: string;
  email_body_html: string;
  delay_days: number;
  trigger_quantity: number;
  coupon_code: string | null;
  discount_percent: number | null;
  is_active: boolean;
}

const replaceVariables = (template: string, order: OrderData, coupon: string | null, discount: number | null): string => {
  const firstName = order.customer_name.split(" ")[0];
  const siteUrl = "https://dietajavca.com.br";
  
  return template
    .replace(/{nome}/g, firstName)
    .replace(/{nome_completo}/g, order.customer_name)
    .replace(/{pedido}/g, order.order_number)
    .replace(/{total}/g, order.total.toFixed(2).replace(".", ","))
    .replace(/{link}/g, siteUrl)
    .replace(/{cupom}/g, coupon || "")
    .replace(/{desconto}/g, String(discount || 0));
};

const getTotalMarmitas = (items: any[]): number => {
  let total = 0;
  for (const item of items) {
    if (item.type === 'marmita' || item.name?.toLowerCase().includes('marmita')) {
      total += item.quantity || 1;
    }
  }
  return total;
};

const sendWhatsAppNotification = async (phone: string, message: string, orderNumber: string) => {
  const apiToken = Deno.env.get("NOTIFICAME_API_TOKEN");
  const channelToken = Deno.env.get("NOTIFICAME_WHATSAPP_CHANNEL_TOKEN");

  if (!apiToken || !channelToken) {
    console.error("NotificaMe credentials not configured");
    return;
  }

  try {
    const response = await fetch("https://hub.notificame.com.br/v1/messages/send", {
      method: "POST",
      headers: {
        "Authorization": apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: "whatsapp",
        channelToken: channelToken,
        destination: `55${phone.replace(/\D/g, "")}`,
        message: {
          type: "text",
          text: message,
        },
      }),
    });

    const result = await response.json();
    console.log(`WhatsApp recompra sent for order ${orderNumber}:`, result);
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
  }
};

const sendEmailNotification = async (
  email: string, 
  order: OrderData, 
  subject: string, 
  bodyHtml: string, 
  coupon: string | null, 
  discount: number | null
) => {
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const firstName = order.customer_name.split(" ")[0];
  const siteUrl = "https://dietajavca.com.br";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">🎁</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">Cupom Especial para Você!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Olá <strong>${firstName}</strong>!
          </p>
          
          <div style="font-size: 16px; color: #666; margin-bottom: 25px;">
            ${replaceVariables(bodyHtml, order, coupon, discount)}
          </div>
          
          ${coupon ? `
          <!-- Coupon Box -->
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px dashed #f59e0b; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: bold;">SEU CUPOM DE DESCONTO</p>
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #b45309; letter-spacing: 4px;">${coupon}</p>
            <p style="margin: 15px 0 0 0; color: #92400e; font-size: 18px; font-weight: bold;">${discount}% OFF</p>
          </div>
          ` : ''}
          
          <!-- CTA -->
          <div style="text-align: center;">
            <a href="${siteUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              🥗 Fazer Novo Pedido
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
            Dúvidas? Fale conosco pelo WhatsApp
          </p>
          <a href="https://wa.me/5577991001658" style="color: #ec4899; text-decoration: none; font-weight: bold;">
            📱 (77) 99100-1658
          </a>
          <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
            © ${new Date().getFullYear()} Dieta Já - Alimentação Saudável
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await resend.emails.send({
      from: "Dieta Já <pedidos@dietajavca.com.br>",
      to: [email],
      subject: replaceVariables(subject, order, coupon, discount),
      html,
    });
    console.log(`Email recompra sent for order ${order.order_number}:`, response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting recompra campaigns job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active recompra templates
    const { data: templates, error: templateError } = await supabase
      .from("marketing_messages")
      .select("*")
      .like("message_type", "recompra_%")
      .eq("is_active", true);

    if (templateError) {
      console.error("Error fetching templates:", templateError);
      throw templateError;
    }

    if (!templates || templates.length === 0) {
      console.log("No active recompra templates found");
      return new Response(
        JSON.stringify({ success: true, processed: 0, reason: "no_templates" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${templates.length} active recompra templates`);

    let totalProcessed = 0;

    for (const template of templates as CampaignTemplate[]) {
      const delayDays = template.delay_days;
      const triggerQuantity = template.trigger_quantity;
      const messageType = template.message_type;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - delayDays);

      // Find delivered orders that match criteria and haven't received this campaign
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, customer_phone, total, delivered_at, items")
        .eq("status", "delivered")
        .not("delivered_at", "is", null)
        .lte("delivered_at", cutoffDate.toISOString());

      if (ordersError) {
        console.error(`Error fetching orders for ${messageType}:`, ordersError);
        continue;
      }

      if (!orders || orders.length === 0) {
        console.log(`No eligible orders for ${messageType}`);
        continue;
      }

      // Get already sent campaigns
      const { data: sentCampaigns } = await supabase
        .from("recompra_campaigns")
        .select("order_id")
        .eq("message_type", messageType);

      const sentOrderIds = new Set((sentCampaigns || []).map(c => c.order_id));

      for (const order of orders) {
        // Skip if already sent
        if (sentOrderIds.has(order.id)) continue;

        // Check quantity matches
        const totalMarmitas = getTotalMarmitas(order.items || []);
        
        // Match range: recompra_5 = 5-13, recompra_14 = 14-27, recompra_28 = 28+
        let matches = false;
        if (messageType === 'recompra_5' && totalMarmitas >= 5 && totalMarmitas < 14) {
          matches = true;
        } else if (messageType === 'recompra_14' && totalMarmitas >= 14 && totalMarmitas < 28) {
          matches = true;
        } else if (messageType === 'recompra_28' && totalMarmitas >= 28) {
          matches = true;
        }

        if (!matches) continue;

        try {
          // Send WhatsApp
          const whatsappMessage = replaceVariables(
            template.whatsapp_template, 
            order as OrderData, 
            template.coupon_code, 
            template.discount_percent
          );
          await sendWhatsAppNotification(order.customer_phone, whatsappMessage, order.order_number);

          // Send Email
          await sendEmailNotification(
            order.customer_email,
            order as OrderData,
            template.email_subject,
            template.email_body_html,
            template.coupon_code,
            template.discount_percent
          );

          // Record campaign sent
          await supabase
            .from("recompra_campaigns")
            .insert({
              order_id: order.id,
              message_type: messageType,
            });

          totalProcessed++;
          console.log(`Recompra campaign ${messageType} sent for order ${order.order_number} (${totalMarmitas} marmitas)`);

          // Small delay between sends
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing order ${order.order_number} for ${messageType}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-recompra-campaigns:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
