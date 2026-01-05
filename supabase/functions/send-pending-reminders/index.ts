import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
}

interface PendingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: OrderItem[];
  total: number;
  created_at: string;
  reminder_sent_at: string | null;
  whatsapp_sent_at: string | null;
}

// Send WhatsApp message via NotificaMe Hub
async function sendWhatsAppMessage(
  phone: string, 
  message: string, 
  apiToken: string, 
  channelToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Format phone number - remove non-digits and ensure it has country code
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('55')) {
      // Already has country code
    } else if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`Sending WhatsApp to ${formattedPhone} via NotificaMe Hub`);

    const response = await fetch('https://hub.notificame.com.br/v1/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'whatsapp',
        channelToken: channelToken,
        to: formattedPhone,
        message: {
          type: 'text',
          text: message,
        },
      }),
    });

    const responseText = await response.text();
    console.log(`NotificaMe response status: ${response.status}, body: ${responseText}`);

    if (!response.ok) {
      return { success: false, error: `NotificaMe API error: ${response.status} - ${responseText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending WhatsApp via NotificaMe:', error);
    return { success: false, error: error.message };
  }
}

// Generate WhatsApp reminder message
function generateWhatsAppMessage(order: PendingOrder, orderNumber: string, timeSinceOrder: string): string {
  return `Olá ${order.customer_name}! 😊

Notamos que seu pedido *#${orderNumber}* está aguardando pagamento há ${timeSinceOrder}.

💰 *Valor: R$ ${order.total.toFixed(2).replace('.', ',')}*

Finalize agora e garanta sua entrega!

Precisa de ajuda? Responda esta mensagem. 💚

- Equipe Dieta Já`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pending-reminders function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get NotificaMe credentials
    const notificameApiToken = Deno.env.get("NOTIFICAME_API_TOKEN");
    const notificameChannelToken = Deno.env.get("NOTIFICAME_WHATSAPP_CHANNEL_TOKEN");

    const hasWhatsAppCredentials = notificameApiToken && notificameChannelToken;
    if (!hasWhatsAppCredentials) {
      console.warn("NotificaMe credentials not configured - WhatsApp messages will be skipped");
    }

    // Find orders that are 'confirmed', created more than 1 hour ago,
    // less than 25 hours ago, and haven't received BOTH email and whatsapp reminders yet
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    console.log(`Looking for orders between ${twentyFiveHoursAgo} and ${oneHourAgo}`);

    // Get orders that need either email OR whatsapp reminder
    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "confirmed")
      .lt("created_at", oneHourAgo)
      .gt("created_at", twentyFiveHoursAgo)
      .or("reminder_sent_at.is.null,whatsapp_sent_at.is.null")
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching pending orders:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingOrders?.length || 0} pending orders to process`);

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending orders to remind", sent: { email: 0, whatsapp: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let emailSentCount = 0;
    let whatsappSentCount = 0;
    let errorCount = 0;

    for (const order of pendingOrders as PendingOrder[]) {
      try {
        const orderNumber = order.order_number || order.id.slice(0, 8);
        const timeSinceOrder = getTimeSinceOrder(order.created_at);
        const updateFields: Record<string, string> = {};

        // Send email if not sent yet
        if (!order.reminder_sent_at) {
          console.log(`Sending email reminder for order ${orderNumber} to ${order.customer_email}`);

          const emailHtml = generateReminderEmail(order, orderNumber, timeSinceOrder);

          try {
            const emailResponse = await resend.emails.send({
              from: "Dieta Já <pedidos@dietaja.com.br>",
              to: [order.customer_email],
              subject: `⏰ Seu pedido #${orderNumber} está aguardando pagamento`,
              html: emailHtml,
            });

            console.log(`Email sent to ${order.customer_email}:`, emailResponse);
            updateFields.reminder_sent_at = new Date().toISOString();
            emailSentCount++;
          } catch (emailError) {
            console.error(`Error sending email to ${order.customer_email}:`, emailError);
          }
        }

        // Send WhatsApp if not sent yet and credentials are configured
        if (!order.whatsapp_sent_at && hasWhatsAppCredentials) {
          console.log(`Sending WhatsApp reminder for order ${orderNumber} to ${order.customer_phone}`);

          const whatsappMessage = generateWhatsAppMessage(order, orderNumber, timeSinceOrder);
          const whatsappResult = await sendWhatsAppMessage(
            order.customer_phone,
            whatsappMessage,
            notificameApiToken!,
            notificameChannelToken!
          );

          if (whatsappResult.success) {
            console.log(`WhatsApp sent to ${order.customer_phone}`);
            updateFields.whatsapp_sent_at = new Date().toISOString();
            whatsappSentCount++;
          } else {
            console.error(`Error sending WhatsApp to ${order.customer_phone}:`, whatsappResult.error);
          }
        }

        // Update order with sent timestamps
        if (Object.keys(updateFields).length > 0) {
          const { error: updateError } = await supabase
            .from("orders")
            .update(updateFields)
            .eq("id", order.id);

          if (updateError) {
            console.error(`Error updating order ${order.id}:`, updateError);
          }
        }

        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        errorCount++;
      }
    }

    const result = {
      message: `Processed ${pendingOrders.length} orders`,
      sent: {
        email: emailSentCount,
        whatsapp: whatsappSentCount,
      },
      errors: errorCount,
    };

    console.log("send-pending-reminders completed:", result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-pending-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function getTimeSinceOrder(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} minutos`;
}

function generateReminderEmail(order: PendingOrder, orderNumber: string, timeSinceOrder: string): string {
  const itemsList = order.items
    .map((item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
          ${item.quantity}x ${item.name}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
          R$ ${item.totalPrice.toFixed(2).replace(".", ",")}
        </td>
      </tr>
    `)
    .join("");

  const whatsappMessage = encodeURIComponent(
    `Olá! Gostaria de finalizar meu pedido #${orderNumber}`
  );
  const whatsappLink = `https://wa.me/5511999999999?text=${whatsappMessage}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ Lembrete de Pagamento</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                    Olá <strong>${order.customer_name}</strong>!
                  </p>
                  
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      Notamos que seu pedido <strong>#${orderNumber}</strong> está aguardando pagamento há <strong>${timeSinceOrder}</strong>.
                    </p>
                  </div>

                  <p style="margin: 0 0 20px; font-size: 14px; color: #666;">
                    Não queremos que você perca sua reserva! Finalize seu pagamento para garantir sua entrega.
                  </p>

                  <!-- Order Summary -->
                  <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">📦 Resumo do Pedido</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #333;">
                      ${itemsList}
                      <tr>
                        <td style="padding: 12px 0 0; font-weight: bold; font-size: 16px; color: #16a34a;">
                          Total
                        </td>
                        <td style="padding: 12px 0 0; font-weight: bold; font-size: 16px; color: #16a34a; text-align: right;">
                          R$ ${order.total.toFixed(2).replace(".", ",")}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- CTA Buttons -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 10px 0;">
                        <a href="${whatsappLink}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                          💬 Finalizar via WhatsApp
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0 0; font-size: 12px; color: #999; text-align: center;">
                    Se você já realizou o pagamento, por favor desconsidere este email.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 12px; color: #999;">
                    Dieta Já - Alimentação Saudável
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

serve(handler);