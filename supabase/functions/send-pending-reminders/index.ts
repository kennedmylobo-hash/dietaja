import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl, TenantBranding } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials, getEmailCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText, type EvolutionCredentials } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem { name: string; quantity: number; totalPrice: number; type: string; }

interface PendingOrder {
  id: string; order_number: string; customer_name: string; customer_email: string;
  customer_phone: string; items: OrderItem[]; total: number; created_at: string;
  reminder_sent_at: string | null; whatsapp_sent_at: string | null; whatsapp_2_sent_at: string | null;
  mp_payment_id: string | null; tenant_id: string | null;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function generateWhatsAppMessage(order: PendingOrder & { pix_qr_code?: string }, orderNumber: string, timeSinceOrder: string, isSecondReminder: boolean, brandName: string): string {
  const urgencyText = isSecondReminder ? `⚠️ *ÚLTIMA CHANCE!* Seu pedido será cancelado em breve.` : `Você está a um passo de concluir!`;
  const pixSection = order.pix_qr_code ? `\n\n💳 *Pague agora via PIX:*\n\n\`\`\`${order.pix_qr_code}\`\`\`\n` : '';
  return `Olá ${order.customer_name}! 😊\n\nNotamos que seu pedido *#${orderNumber}* está aguardando pagamento há ${timeSinceOrder}.\n\n${urgencyText}\n\n💰 *Valor: ${formatCurrency(order.total)}*${pixSection}\n\nFinalize agora e garanta sua entrega!\n\nPrecisa de ajuda? Responda esta mensagem. 💚\n\n- Equipe ${brandName}`;
}

function getTimeSinceOrder(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutos`;
}

function generateReminderEmail(order: PendingOrder, orderNumber: string, timeSinceOrder: string, isSecondReminder: boolean, branding: TenantBranding): string {
  const itemsList = order.items.map(item => `<tr><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${item.quantity}x ${item.name}</td><td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">R$ ${item.totalPrice.toFixed(2).replace(".", ",")}</td></tr>`).join("");
  const whatsappMessage = encodeURIComponent(`Olá! Gostaria de finalizar meu pedido #${orderNumber}`);
  const whatsappLink = `https://wa.me/${branding.whatsapp}?text=${whatsappMessage}`;
  const headerColor = isSecondReminder ? "#ef4444" : "#16a34a";
  const headerTitle = isSecondReminder ? "⚠️ Última Chance!" : "⏰ Lembrete de Pagamento";
  const urgencyMessage = isSecondReminder ? "Seu pedido será <strong>cancelado em breve</strong> se o pagamento não for confirmado." : "Não queremos que você perca sua reserva! Finalize seu pagamento para garantir sua entrega.";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <tr><td style="background: linear-gradient(135deg, ${headerColor} 0%, ${isSecondReminder ? '#f97316' : '#22c55e'} 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${headerTitle}</h1>
      </td></tr>
      <tr><td style="padding: 30px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #333;">Olá <strong>${order.customer_name}</strong>!</p>
        <div style="background-color: ${isSecondReminder ? '#fef2f2' : '#fef3c7'}; border-left: 4px solid ${isSecondReminder ? '#ef4444' : '#f59e0b'}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: ${isSecondReminder ? '#991b1b' : '#92400e'}; font-size: 14px;">Seu pedido <strong>#${orderNumber}</strong> está aguardando pagamento há <strong>${timeSinceOrder}</strong>.</p>
        </div>
        <p style="margin: 0 0 20px; font-size: 14px; color: #666;">${urgencyMessage}</p>
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">📦 Resumo do Pedido</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #333;">
            ${itemsList}
            <tr><td style="padding: 12px 0 0; font-weight: bold; font-size: 16px; color: #16a34a;">Total</td><td style="padding: 12px 0 0; font-weight: bold; font-size: 16px; color: #16a34a; text-align: right;">${formatCurrency(order.total)}</td></tr>
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
  </td></tr></table>
</body></html>`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pending-reminders function called");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Statuses that represent unpaid orders
    const unpaidStatuses = ['awaiting_payment', 'pending', 'whatsapp_pending'];

    let firstReminderOrders: any[] = [];
    if (firstReminderActive) {
      const { data } = await supabase.from("orders").select("*")
        .in("status", unpaidStatuses).lt("created_at", firstReminderThreshold)
        .gt("created_at", twentyFourHoursAgo).is("reminder_sent_at", null)
        .order("created_at", { ascending: true });
      firstReminderOrders = data || [];
    }

    let secondReminderOrders: any[] = [];
    if (secondReminderActive) {
      const { data } = await supabase.from("orders").select("*")
        .in("status", unpaidStatuses).lt("created_at", secondReminderThreshold)
        .gt("created_at", twentyFourHoursAgo).not("reminder_sent_at", "is", null)
        .is("whatsapp_2_sent_at", null).order("created_at", { ascending: true });
      secondReminderOrders = data || [];
    }

    const allOrders = [
      ...firstReminderOrders.map(o => ({ ...o, isSecondReminder: false })),
      ...secondReminderOrders.map(o => ({ ...o, isSecondReminder: true })),
    ];

    if (allOrders.length === 0) {
      return new Response(JSON.stringify({ message: "No pending orders to remind", sent: { email: 0, whatsapp: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    let emailSentCount = 0, whatsappSentCount = 0, errorCount = 0;
    const cache: Record<string, { branding: TenantBranding; whatsappCreds: EvolutionCredentials | null; emailCreds: any }> = {};

    async function resolveCtx(tenantId: string | null) {
      const key = tenantId || '__default__';
      if (!cache[key]) {
        cache[key] = {
          branding: await getTenantBranding(supabase, tenantId),
          whatsappCreds: await getWhatsAppCredentials(supabase, tenantId),
          emailCreds: await getEmailCredentials(supabase, tenantId),
        };
      }
      return cache[key];
    }

    for (const orderWithFlag of allOrders) {
      const { isSecondReminder, ...order } = orderWithFlag as PendingOrder & { isSecondReminder: boolean };
      try {
        const orderNumber = order.order_number || order.id.slice(0, 8);
        const timeSinceOrder = getTimeSinceOrder(order.created_at);
        const updateFields: Record<string, string> = {};
        const { branding, whatsappCreds, emailCreds } = await resolveCtx(order.tenant_id);

        // Send email
        const emailHtml = generateReminderEmail(order, orderNumber, timeSinceOrder, isSecondReminder, branding);
        try {
          const resend = new Resend(emailCreds.apiKey);
          const emailResponse = await resend.emails.send({
            from: `${branding.brand_name} <${emailCreds.fromEmail}>`,
            to: [order.customer_email],
            subject: isSecondReminder ? `⚠️ ÚLTIMA CHANCE - Pedido #${orderNumber} aguardando pagamento` : `⏰ Seu pedido #${orderNumber} está aguardando pagamento`,
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
        }

        // Send WhatsApp via Evolution API
        if (whatsappCreds) {
          const whatsappMessage = generateWhatsAppMessage(order, orderNumber, timeSinceOrder, isSecondReminder, branding.brand_name);
          const whatsappResult = await sendWhatsAppText(order.customer_phone, whatsappMessage, whatsappCreds);

          await supabase.from('notification_events').insert({
            channel: 'whatsapp', event_type: whatsappResult.success ? 'sent' : 'failed',
            order_id: order.id, order_number: orderNumber, recipient_phone: order.customer_phone,
            template_name: isSecondReminder ? 'reminder_2' : 'reminder_1',
            message_id: whatsappResult.messageId,
            metadata: { response: whatsappResult.response, error: whatsappResult.error }
          });

          if (whatsappResult.success) {
            whatsappSentCount++;
            if (isSecondReminder) updateFields.whatsapp_2_sent_at = new Date().toISOString();
            else updateFields.whatsapp_sent_at = new Date().toISOString();
          }
        }

        if (Object.keys(updateFields).length > 0) {
          await supabase.from("orders").update(updateFields).eq("id", order.id);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`Error processing order ${order.id}:`, error.message);
      }
    }

    return new Response(JSON.stringify({
      success: true, sent: { email: emailSentCount, whatsapp: whatsappSentCount },
      total: allOrders.length, errors: errorCount
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in send-pending-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
