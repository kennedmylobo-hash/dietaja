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
  whatsapp_2_sent_at: string | null;
  mp_payment_id: string | null;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// Send WhatsApp template message (for messages outside 24h window)
async function sendWhatsAppTemplate(
  phone: string,
  templateId: string,
  fields: Record<string, string>,
  apiToken: string,
  channelToken: string,
  orderNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatPhone(phone);
    
    console.log(`[TEMPLATE] Sending WhatsApp template "${templateId}" to ${formattedPhone} for order ${orderNumber}`);
    console.log(`[TEMPLATE] Fields:`, JSON.stringify(fields));

    const payload = {
      from: channelToken,
      to: formattedPhone,
      contents: [{
        type: 'template',
        templateId: templateId,
        fields: fields
      }],
    };

    console.log(`[TEMPLATE] Full payload:`, JSON.stringify(payload));

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'X-Api-Token': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`[TEMPLATE] NotificaMe response for ${orderNumber}: ${response.status} - ${responseText}`);

    if (!response.ok) {
      return { success: false, error: `NotificaMe API error: ${response.status} - ${responseText}` };
    }

    console.log(`[TEMPLATE] WhatsApp template sent successfully for order ${orderNumber}`);
    return { success: true };
  } catch (error: any) {
    console.error('[TEMPLATE] Error sending WhatsApp template:', error);
    return { success: false, error: error.message };
  }
}

// Send simple text message (fallback for within 24h window)
async function sendWhatsAppText(
  phone: string, 
  message: string, 
  apiToken: string, 
  channelToken: string,
  orderNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatPhone(phone);

    console.log(`[TEXT] Sending WhatsApp to ${formattedPhone} for order ${orderNumber}`);

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'X-Api-Token': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: channelToken,
        to: formattedPhone,
        contents: [{ type: 'text', text: message }],
      }),
    });

    const responseText = await response.text();
    console.log(`[TEXT] NotificaMe response for ${orderNumber}: ${response.status} - ${responseText}`);

    if (!response.ok) {
      return { success: false, error: `NotificaMe API error: ${response.status} - ${responseText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[TEXT] Error sending WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

// Generate WhatsApp reminder message
function generateWhatsAppMessage(order: PendingOrder, orderNumber: string, timeSinceOrder: string, isSecondReminder: boolean): string {
  const urgencyText = isSecondReminder 
    ? `⚠️ *ÚLTIMA CHANCE!* Seu pedido será cancelado em breve.`
    : `Você está a um passo de concluir!`;

  return `Olá ${order.customer_name}! 😊

Notamos que seu pedido *#${orderNumber}* está aguardando pagamento há ${timeSinceOrder}.

${urgencyText}

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

    // Time thresholds
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`Time thresholds - 15min: ${fifteenMinutesAgo}, 6h: ${sixHoursAgo}, 24h: ${twentyFourHoursAgo}`);

    // Get orders that need FIRST reminder (15+ minutes, no reminder sent yet)
    const { data: firstReminderOrders, error: firstFetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "confirmed")
      .lt("created_at", fifteenMinutesAgo)
      .gt("created_at", twentyFourHoursAgo)
      .is("reminder_sent_at", null)
      .order("created_at", { ascending: true });

    if (firstFetchError) {
      console.error("Error fetching first reminder orders:", firstFetchError);
      throw firstFetchError;
    }

    // Get orders that need SECOND reminder (6+ hours, first reminder sent, no second reminder)
    const { data: secondReminderOrders, error: secondFetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "confirmed")
      .lt("created_at", sixHoursAgo)
      .gt("created_at", twentyFourHoursAgo)
      .not("reminder_sent_at", "is", null)
      .is("whatsapp_2_sent_at", null)
      .order("created_at", { ascending: true });

    if (secondFetchError) {
      console.error("Error fetching second reminder orders:", secondFetchError);
      throw secondFetchError;
    }

    console.log(`Found ${firstReminderOrders?.length || 0} orders for 1st reminder (15min)`);
    console.log(`Found ${secondReminderOrders?.length || 0} orders for 2nd reminder (6h)`);

    const allOrders = [
      ...(firstReminderOrders || []).map(o => ({ ...o, isSecondReminder: false })),
      ...(secondReminderOrders || []).map(o => ({ ...o, isSecondReminder: true })),
    ];

    if (allOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending orders to remind", sent: { email: 0, whatsapp: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let emailSentCount = 0;
    let whatsappSentCount = 0;
    let errorCount = 0;

    for (const orderWithFlag of allOrders) {
      const { isSecondReminder, ...order } = orderWithFlag as PendingOrder & { isSecondReminder: boolean };
      
      try {
        const orderNumber = order.order_number || order.id.slice(0, 8);
        const timeSinceOrder = getTimeSinceOrder(order.created_at);
        const updateFields: Record<string, string> = {};

        console.log(`Processing order ${orderNumber} - ${isSecondReminder ? '2nd' : '1st'} reminder`);

        // Send email
        console.log(`Sending email reminder for order ${orderNumber} to ${order.customer_email}`);
        const emailHtml = generateReminderEmail(order, orderNumber, timeSinceOrder, isSecondReminder);

        try {
          const emailResponse = await resend.emails.send({
            from: "Dieta Já <pedidos@dietajavca.com.br>",
            to: [order.customer_email],
            subject: isSecondReminder 
              ? `⚠️ ÚLTIMA CHANCE - Pedido #${orderNumber} aguardando pagamento`
              : `⏰ Seu pedido #${orderNumber} está aguardando pagamento`,
            html: emailHtml,
          });

          console.log(`Email sent to ${order.customer_email}:`, emailResponse);
          emailSentCount++;
          
          if (!isSecondReminder) {
            updateFields.reminder_sent_at = new Date().toISOString();
          }
        } catch (emailError) {
          console.error(`Error sending email to ${order.customer_email}:`, emailError);
        }

        // Send WhatsApp if credentials are configured
        if (hasWhatsAppCredentials) {
          console.log(`Sending WhatsApp reminder for order ${orderNumber} to ${order.customer_phone}`);

          // Try to get PIX code from Mercado Pago if available
          let pixCode: string | null = null;
          if (order.mp_payment_id) {
            try {
              const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
              if (mpAccessToken) {
                console.log(`Fetching PIX code from MP for payment ${order.mp_payment_id}`);
                const mpResponse = await fetch(
                  `https://api.mercadopago.com/v1/payments/${order.mp_payment_id}`,
                  {
                    headers: { 'Authorization': `Bearer ${mpAccessToken}` }
                  }
                );
                if (mpResponse.ok) {
                  const mpData = await mpResponse.json();
                  pixCode = mpData.point_of_interaction?.transaction_data?.qr_code || null;
                  console.log(`PIX code retrieved: ${pixCode ? 'Yes' : 'No'}`);
                }
              }
            } catch (mpError) {
              console.error('Error fetching PIX from Mercado Pago:', mpError);
            }
          }

          let whatsappResult: { success: boolean; error?: string };

          // If we have PIX code, use the template (outside 24h window)
          if (pixCode) {
            console.log(`Using template pix_pendente_dietaja for order ${orderNumber}`);
            const templateFields = {
              "1": order.customer_name?.split(' ')[0] || 'cliente',
              "2": orderNumber,
              "3": formatCurrency(order.total),
              "4": pixCode
            };
            whatsappResult = await sendWhatsAppTemplate(
              order.customer_phone,
              'pix_pendente_dietaja',
              templateFields,
              notificameApiToken!,
              notificameChannelToken!,
              orderNumber
            );
          } else {
            // Fallback to text message (within 24h window or no PIX)
            console.log(`Using text message for order ${orderNumber} (no PIX code)`);
            const whatsappMessage = generateWhatsAppMessage(order, orderNumber, timeSinceOrder, isSecondReminder);
            whatsappResult = await sendWhatsAppText(
              order.customer_phone,
              whatsappMessage,
              notificameApiToken!,
              notificameChannelToken!,
              orderNumber
            );
          }

          if (whatsappResult.success) {
            console.log(`WhatsApp sent to ${order.customer_phone}`);
            whatsappSentCount++;
            
            if (isSecondReminder) {
              updateFields.whatsapp_2_sent_at = new Date().toISOString();
            } else {
              updateFields.whatsapp_sent_at = new Date().toISOString();
            }
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
      message: `Processed ${allOrders.length} orders`,
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

function generateReminderEmail(order: PendingOrder, orderNumber: string, timeSinceOrder: string, isSecondReminder: boolean): string {
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
  const whatsappLink = `https://wa.me/5577991001658?text=${whatsappMessage}`;

  const headerColor = isSecondReminder ? "#ef4444" : "#16a34a";
  const headerTitle = isSecondReminder ? "⚠️ Última Chance!" : "⏰ Lembrete de Pagamento";
  const urgencyMessage = isSecondReminder 
    ? "Seu pedido será <strong>cancelado em breve</strong> se o pagamento não for confirmado."
    : "Não queremos que você perca sua reserva! Finalize seu pagamento para garantir sua entrega.";

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
                <td style="background: linear-gradient(135deg, ${headerColor} 0%, ${isSecondReminder ? '#f97316' : '#22c55e'} 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${headerTitle}</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333;">
                    Olá <strong>${order.customer_name}</strong>!
                  </p>
                  
                  <div style="background-color: ${isSecondReminder ? '#fef2f2' : '#fef3c7'}; border-left: 4px solid ${isSecondReminder ? '#ef4444' : '#f59e0b'}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <p style="margin: 0; color: ${isSecondReminder ? '#991b1b' : '#92400e'}; font-size: 14px;">
                      Seu pedido <strong>#${orderNumber}</strong> está aguardando pagamento há <strong>${timeSinceOrder}</strong>.
                    </p>
                  </div>

                  <p style="margin: 0 0 20px; font-size: 14px; color: #666;">
                    ${urgencyMessage}
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