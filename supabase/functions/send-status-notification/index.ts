import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  order_id: string;
  new_status: string;
}

interface OrderData {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_option: string;
  total: number;
  items: any[];
}

const STATUS_MESSAGES: Record<string, { title: string; message: string; emoji: string; color: string }> = {
  approved: {
    title: "Pagamento Confirmado! ✅",
    message: "Seu pagamento foi aprovado e seu pedido já está na fila de produção. Entrega prevista em até 3 dias úteis.",
    emoji: "✅",
    color: "#22c55e"
  },
  preparing: {
    title: "Em Produção! 👨‍🍳",
    message: "Suas marmitas estão sendo preparadas com carinho pela nossa equipe.",
    emoji: "👨‍🍳",
    color: "#3b82f6"
  },
  ready: {
    title: "Pedido Pronto! 📦",
    message: "Seu pedido está pronto e separado para entrega/retirada.",
    emoji: "📦",
    color: "#8b5cf6"
  },
  delivering: {
    title: "Saiu para Entrega! 🛵",
    message: "Seu pedido está a caminho! Em breve chegará até você.",
    emoji: "🛵",
    color: "#f59e0b"
  },
  delivered: {
    title: "Pedido Entregue! 🎉",
    message: "Seu pedido foi entregue com sucesso. Bom apetite!",
    emoji: "🎉",
    color: "#10b981"
  },
  cancelled: {
    title: "Pedido Cancelado 😢",
    message: "Infelizmente seu pedido foi cancelado. Entre em contato se precisar de ajuda.",
    emoji: "❌",
    color: "#ef4444"
  }
};

const sendWhatsAppNotification = async (phone: string, orderNumber: string, status: string, customerName: string) => {
  const statusInfo = STATUS_MESSAGES[status];
  if (!statusInfo) {
    console.log(`No WhatsApp message configured for status: ${status}`);
    return;
  }

  const apiToken = Deno.env.get("NOTIFICAME_API_TOKEN");
  const channelToken = Deno.env.get("NOTIFICAME_WHATSAPP_CHANNEL_TOKEN");

  if (!apiToken || !channelToken) {
    console.error("NotificaMe credentials not configured");
    return;
  }

  const firstName = customerName.split(" ")[0];
  const message = `${statusInfo.emoji} *${statusInfo.title}*\n\nOlá ${firstName}!\n\n${statusInfo.message}\n\n📋 Pedido: *#${orderNumber}*\n\n🔗 Acompanhe: https://dietajavca.com.br/pedido/${orderNumber}\n\n_Dieta Já - Alimentação Saudável_`;

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
    console.log(`WhatsApp sent for order ${orderNumber}, status ${status}:`, result);
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
  }
};

const sendEmailNotification = async (email: string, order: OrderData, status: string) => {
  const statusInfo = STATUS_MESSAGES[status];
  if (!statusInfo) {
    console.log(`No email configured for status: ${status}`);
    return;
  }

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const firstName = order.customer_name.split(" ")[0];
  const trackingUrl = `https://dietajavca.com.br/pedido/${order.order_number}`;

  const itemsHtml = order.items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}x</td>
    </tr>
  `).join("");

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
        <div style="background: ${statusInfo.color}; padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">${statusInfo.emoji}</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">${statusInfo.title}</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Olá <strong>${firstName}</strong>!
          </p>
          
          <p style="font-size: 16px; color: #666; margin-bottom: 25px;">
            ${statusInfo.message}
          </p>
          
          <!-- Order Info -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Número do Pedido</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${statusInfo.color};">#${order.order_number}</p>
          </div>
          
          <!-- Items -->
          <div style="margin-bottom: 25px;">
            <h3 style="color: #333; margin-bottom: 15px;">Itens do Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>
            <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #eee;">
              <span style="font-size: 18px; font-weight: bold; color: ${statusInfo.color};">
                Total: R$ ${order.total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
          
          <!-- Delivery Info -->
          <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
            <p style="margin: 0; color: #166534;">
              📍 ${order.delivery_option === "pickup" ? "Retirada no local" : "Entrega em domicílio"}
            </p>
          </div>
          
          <!-- CTA -->
          <div style="text-align: center;">
            <a href="${trackingUrl}" style="display: inline-block; background: ${statusInfo.color}; color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              📦 Acompanhar Pedido
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
            Dúvidas? Fale conosco pelo WhatsApp
          </p>
          <a href="https://wa.me/5577991001658" style="color: ${statusInfo.color}; text-decoration: none; font-weight: bold;">
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
      subject: `${statusInfo.emoji} Pedido #${order.order_number} - ${statusInfo.title}`,
      html,
    });
    console.log(`Email sent for order ${order.order_number}, status ${status}:`, response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, new_status }: NotificationRequest = await req.json();

    if (!order_id || !new_status) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "order_id and new_status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing notification for order ${order_id}, status: ${new_status}`);

    // Skip notification for pending status (handled by other functions)
    if (new_status === "pending" || new_status === "whatsapp_pending") {
      console.log("Skipping notification for pending status");
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order data
    const { data: order, error } = await supabase
      .from("orders")
      .select("order_number, customer_name, customer_email, customer_phone, delivery_option, total, items")
      .eq("id", order_id)
      .single();

    if (error || !order) {
      console.error("Order not found:", error);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found order: ${order.order_number}, sending notifications...`);

    // Send notifications in parallel
    await Promise.all([
      sendWhatsAppNotification(order.customer_phone, order.order_number, new_status, order.customer_name),
      sendEmailNotification(order.customer_email, order as OrderData, new_status),
    ]);

    return new Response(
      JSON.stringify({ success: true, order_number: order.order_number }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-status-notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
