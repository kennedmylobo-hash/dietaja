import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl, TenantBranding } from "../_shared/tenant-branding.ts";

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
  tenant_id: string | null;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

async function sendWhatsAppTemplate(
  phone: string, templateId: string, fields: Record<string, string>,
  apiToken: string, channelToken: string, orderNumber: string,
  supabaseClient: any, orderId?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const formattedPhone = formatPhone(phone);
    console.log(`[TEMPLATE] Sending "${templateId}" to ${formattedPhone} for order ${orderNumber}`);

    const fieldKeys = Object.keys(fields).sort((a, b) => Number(a) - Number(b));
    const parameters = fieldKeys.map(key => ({ type: "text", text: fields[key] }));

    const payload = {
      from: channelToken, to: formattedPhone,
      contents: [{ type: 'template', template: { name: templateId, language: { code: 'pt_BR' }, components: [{ type: 'body', parameters }] } }],
    };

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: { 'X-Api-Token': apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseJson = null;
    try { responseJson = JSON.parse(responseText); } catch (e) {}
    const messageId = responseJson?.id || responseJson?.messageId;

    if (!response.ok) {
      await supabaseClient.from('notification_events').insert({
        channel: 'whatsapp', event_type: 'failed', order_id: orderId, order_number: orderNumber,
        recipient_phone: formattedPhone, template_name: templateId, message_id: messageId,
        metadata: { error: responseText }
      });
      return { success: false, error: `NotificaMe API error: ${response.status} - ${responseText}` };
    }

    await supabaseClient.from('notification_events').insert({
      channel: 'whatsapp', event_type: 'sent', order_id: orderId, order_number: orderNumber,
      recipient_phone: formattedPhone, template_name: templateId, message_id: messageId,
      metadata: { response: responseJson }
    });
    return { success: true, messageId };
  } catch (error: any) {
    console.error('[TEMPLATE] Error:', error);
    return { success: false, error: error.message };
  }
}

async function sendWhatsAppText(
  phone: string, message: string, apiToken: string, channelToken: string,
  orderNumber: string, supabaseClient: any, orderId?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const formattedPhone = formatPhone(phone);
    console.log(`[TEXT] Sending WhatsApp to ${formattedPhone} for order ${orderNumber}`);

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: { 'X-Api-Token': apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: channelToken, to: formattedPhone, contents: [{ type: 'text', text: message }] }),
    });

    const responseText = await response.text();
    let responseJson = null;
    try { responseJson = JSON.parse(responseText); } catch (e) {}
    const messageId = responseJson?.id || responseJson?.messageId;

    if (!response.ok) {
      await supabaseClient.from('notification_events').insert({
        channel: 'whatsapp', event_type: 'failed', order_id: orderId, order_number: orderNumber,
        recipient_phone: formattedPhone, template_name: 'text_reminder', message_id: messageId,
        metadata: { error: responseText }
      });
      return { success: false, error: `NotificaMe API error: ${response.status} - ${responseText}` };
    }

    await supabaseClient.from('notification_events').insert({
      channel: 'whatsapp', event_type: 'sent', order_id: orderId, order_number: orderNumber,
      recipient_phone: formattedPhone, template_name: 'text_reminder', message_id: messageId,
      metadata: { response: responseJson }
    });
    return { success: true, messageId };
  } catch (error: any) {
    console.error('[TEXT] Error:', error);
    return { success: false, error: error.message };
  }
}

function generateWhatsAppMessage(order: PendingOrder, orderNumber: string, timeSinceOrder: string, isSecondReminder: boolean, brandName: string): string {
  const urgencyText = isSecondReminder 
    ? `⚠️ *ÚLTIMA CHANCE!* Seu pedido será cancelado em breve.`
    : `Você está a um passo de concluir!`;

  return `Olá ${order.customer_name}! 😊

Notamos que seu pedido *#${orderNumber}* está aguardando pagamento há ${timeSinceOrder}.

${urgencyText}

💰 *Valor: R$ ${order.total.toFixed(2).replace('.', ',')}*

Finalize agora e garanta sua entrega!

Precisa de ajuda? Responda esta mensagem. 💚

- Equipe ${brandName}`;
}

function getTimeSinceOrder(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutos`;
}

function generateReminderEmail(order: PendingOrder, orderNumber: string, timeSinceOrder: string, isSecondReminder: boolean, branding: TenantBranding): string {
  const itemsList = order.items.map((item) => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${item.quantity}x ${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">R$ ${item.totalPrice.toFixed(2).replace(".", ",")}</td>
    </tr>
  `).join("");

  const whatsappMessage = encodeURIComponent(`Olá! Gostaria de finalizar meu pedido #${orderNumber}`);
  const whatsappLink = `https://wa.me/${branding.whatsapp}?text=${whatsappMessage}`;

  const headerColor = isSecondReminder ? "#ef4444" : "#16a34a";
  const headerTitle = isSecondReminder ? "⚠️ Última Chance!" : "⏰ Lembrete de Pagamento";
  const urgencyMessage = isSecondReminder 
    ? "Seu pedido será <strong>cancelado em breve</strong> se o pagamento não for confirmado."
    : "Não queremos que você perca sua reserva! Finalize seu pagamento para garantir sua entrega.";

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <tr><td style="background: linear-gradient(135deg, ${headerColor} 0%, ${isSecondReminder ? '#f97316' : '#22c55e'} 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${headerTitle}</h1>
            </td></tr>
            <tr><td style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333;">Olá <strong>${order.customer_name}</strong>!</p>
              <div style="background-color: ${isSecondReminder ? '#fef2f2' : '#fef3c7'}; border-left: 4px solid ${isSecondReminder ? '#ef4444' : '#f59e0b'}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: ${isSecondReminder ? '#991b1b' : '#92400e'}; font-size: 14px;">
                  Seu pedido <strong>#${orderNumber}</strong> está aguardando pagamento há <strong>${timeSinceOrder}</strong>.
                </p>
              </div>
              <p style="margin: 0 0 20px; font-size: 14px; color: #666;">${urgencyMessage}</p>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">📦 Resumo do Pedido</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #333;">
                  ${itemsList}
                  <tr>
                    <td style="padding: 12px 0 0; font-weight: bold; font-size: 16px; color: #16a34a;">Total</td>
                    <td style="padding: 12px 0 0; font-weight: bold; font-size: 16px; color: #16a34a; text-align: right;">R$ ${order.total.toFixed(2).replace(".", ",")}</td>
                  </tr>
                </table>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 10px 0;">
                <a href="${whatsappLink}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 14px;">💬 Finalizar via WhatsApp</a>
              </td></tr></table>
              <p style="margin: 20px 0 0; font-size: 12px; color: #999; text-align: center;">Se você já realizou o pagamento, por favor desconsidere este email.</p>
            </td></tr>
            <tr><td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #999;">${branding.brand_name} - Alimentação Saudável</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
  `;
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

    const notificameApiToken = Deno.env.get("NOTIFICAME_API_TOKEN");
    const notificameChannelToken = Deno.env.get("NOTIFICAME_WHATSAPP_CHANNEL_TOKEN");
    const hasWhatsAppCredentials = notificameApiToken && notificameChannelToken;

    // Fetch reminder settings
    const { data: reminderSettings } = await supabase.from("reminder_settings").select("*");

    const firstReminderConfig = reminderSettings?.find(s => s.reminder_type === 'first_reminder');
    const secondReminderConfig = reminderSettings?.find(s => s.reminder_type === 'second_reminder');

    const firstReminderMinutes = firstReminderConfig?.delay_minutes || 15;
    const secondReminderMinutes = secondReminderConfig?.delay_minutes || 360;
    const firstReminderActive = firstReminderConfig?.is_active ?? true;
    const secondReminderActive = secondReminderConfig?.is_active ?? true;

    const firstReminderThreshold = new Date(Date.now() - firstReminderMinutes * 60 * 1000).toISOString();
    const secondReminderThreshold = new Date(Date.now() - secondReminderMinutes * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let firstReminderOrders: any[] = [];
    if (firstReminderActive) {
      const { data } = await supabase.from("orders").select("*")
        .eq("status", "awaiting_payment").lt("created_at", firstReminderThreshold)
        .gt("created_at", twentyFourHoursAgo).is("reminder_sent_at", null)
        .order("created_at", { ascending: true });
      firstReminderOrders = data || [];
    }

    let secondReminderOrders: any[] = [];
    if (secondReminderActive) {
      const { data } = await supabase.from("orders").select("*")
        .eq("status", "awaiting_payment").lt("created_at", secondReminderThreshold)
        .gt("created_at", twentyFourHoursAgo).not("reminder_sent_at", "is", null)
        .is("whatsapp_2_sent_at", null).order("created_at", { ascending: true });
      secondReminderOrders = data || [];
    }

    console.log(`Found ${firstReminderOrders.length} for 1st, ${secondReminderOrders.length} for 2nd reminder`);

    const allOrders = [
      ...firstReminderOrders.map(o => ({ ...o, isSecondReminder: false })),
      ...secondReminderOrders.map(o => ({ ...o, isSecondReminder: true })),
    ];

    if (allOrders.length === 0) {
      return new Response(JSON.stringify({ message: "No pending orders to remind", sent: { email: 0, whatsapp: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    let emailSentCount = 0, whatsappSentCount = 0, errorCount = 0;

    // Branding cache
    const brandingCache: Record<string, TenantBranding> = {};
    async function resolveBranding(tenantId: string | null): Promise<TenantBranding> {
      const key = tenantId || '__default__';
      if (!brandingCache[key]) { brandingCache[key] = await getTenantBranding(supabase, tenantId); }
      return brandingCache[key];
    }

    for (const orderWithFlag of allOrders) {
      const { isSecondReminder, ...order } = orderWithFlag as PendingOrder & { isSecondReminder: boolean };
      
      try {
        const orderNumber = order.order_number || order.id.slice(0, 8);
        const timeSinceOrder = getTimeSinceOrder(order.created_at);
        const updateFields: Record<string, string> = {};
        const branding = await resolveBranding(order.tenant_id);

        // Send email
        const emailHtml = generateReminderEmail(order, orderNumber, timeSinceOrder, isSecondReminder, branding);
        try {
          const emailResponse = await resend.emails.send({
            from: `${branding.brand_name} <pedidos@dietajavca.com.br>`,
            to: [order.customer_email],
            subject: isSecondReminder 
              ? `⚠️ ÚLTIMA CHANCE - Pedido #${orderNumber} aguardando pagamento`
              : `⏰ Seu pedido #${orderNumber} está aguardando pagamento`,
            html: emailHtml,
          });
          emailSentCount++;
          await supabase.from('notification_events').insert({
            channel: 'email', event_type: 'sent', order_id: order.id, order_number: orderNumber,
            recipient_email: order.customer_email, template_name: isSecondReminder ? 'reminder_2' : 'reminder_1',
            message_id: (emailResponse as any)?.id, metadata: { response: emailResponse }
          });
          if (!isSecondReminder) updateFields.reminder_sent_at = new Date().toISOString();
        } catch (emailError: any) {
          console.error(`Error sending email to ${order.customer_email}:`, emailError);
          await supabase.from('notification_events').insert({
            channel: 'email', event_type: 'failed', order_id: order.id, order_number: orderNumber,
            recipient_email: order.customer_email, template_name: isSecondReminder ? 'reminder_2' : 'reminder_1',
            metadata: { error: emailError.message }
          });
        }

        // Send WhatsApp
        if (hasWhatsAppCredentials) {
          let pixCode: string | null = null;
          if (order.mp_payment_id) {
            try {
              const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
              if (mpAccessToken) {
                const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${order.mp_payment_id}`, {
                  headers: { 'Authorization': `Bearer ${mpAccessToken}` }
                });
                if (mpResponse.ok) {
                  const mpData = await mpResponse.json();
                  pixCode = mpData.point_of_interaction?.transaction_data?.qr_code || null;
                }
              }
            } catch (mpError) { console.error('Error fetching PIX from MP:', mpError); }
          }

          let whatsappResult: { success: boolean; error?: string; messageId?: string };
          const PIX_PENDING_TEMPLATE_ENABLED = true;

          if (pixCode && PIX_PENDING_TEMPLATE_ENABLED) {
            const templateFields = {
              "1": order.customer_name?.split(' ')[0] || 'cliente',
              "2": orderNumber,
              "3": formatCurrency(order.total),
              "4": pixCode
            };
            whatsappResult = await sendWhatsAppTemplate(order.customer_phone, 'pix_pendente_dietaja', templateFields,
              notificameApiToken!, notificameChannelToken!, orderNumber, supabase, order.id);
          } else if (pixCode) {
            whatsappResult = { success: true };
          } else {
            const whatsappMessage = generateWhatsAppMessage(order, orderNumber, timeSinceOrder, isSecondReminder, branding.brand_name);
            whatsappResult = await sendWhatsAppText(order.customer_phone, whatsappMessage,
              notificameApiToken!, notificameChannelToken!, orderNumber, supabase, order.id);
          }

          if (whatsappResult.success) {
            whatsappSentCount++;
            if (isSecondReminder) updateFields.whatsapp_2_sent_at = new Date().toISOString();
            else updateFields.whatsapp_sent_at = new Date().toISOString();
          }
        }

        if (Object.keys(updateFields).length > 0) {
          await supabase.from("orders").update(updateFields).eq("id", order.id);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        errorCount++;
      }
    }

    const result = { message: `Processed ${allOrders.length} orders`, sent: { email: emailSentCount, whatsapp: whatsappSentCount }, errors: errorCount };
    console.log("send-pending-reminders completed:", result);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: any) {
    console.error("Error in send-pending-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
