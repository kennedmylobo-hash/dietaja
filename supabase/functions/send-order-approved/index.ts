import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";
import { getWhatsAppCredentials, getEmailCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: string;
  flavors?: Array<{ name: string; quantity: number; category?: string }>;
}

interface OrderApprovedRequest {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_option: string;
  delivery_address?: string;
  payment_method?: string;
  tenant_id?: string;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatItemsList(items: OrderItem[]): string {
  return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
}

const generateEmailHtml = (data: OrderApprovedRequest, brandName: string, whatsapp: string, whatsappFormatted: string, baseUrl: string): string => {
  const itemsHtml = data.items.map(item => {
    let flavorsHtml = '';
    if (item.flavors && item.flavors.length > 0) {
      flavorsHtml = `<div style="margin-top: 4px; padding-left: 12px; font-size: 12px; color: #666;">${item.flavors.map(f => `• ${f.quantity}x ${f.name}`).join('<br>')}</div>`;
    }
    return `<tr><td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong>${flavorsHtml}</td><td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;">R$ ${item.totalPrice.toFixed(2).replace('.', ',')}</td></tr>`;
  }).join('');

  const deliveryInfo = data.delivery_option === 'pickup' ? '📍 Retirada no local' : `🛵 Entrega - ${data.delivery_address}`;
  const paymentMethodText = data.payment_method === 'pix' ? 'PIX' : 'Mercado Pago';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 24px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🥗 ${brandName}</h1>
    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Alimentação saudável para sua rotina</p>
  </div>
  <div style="text-align: center; padding: 32px 24px 16px;">
    <h2 style="margin: 16px 0 8px; color: #16a34a; font-size: 24px;">Pedido Confirmado! ✅</h2>
    <p style="margin: 0; font-size: 14px; color: #666;">Pagamento recebido via ${paymentMethodText}</p>
  </div>
  <div style="margin: 0 24px; padding: 16px; background-color: #f0fdf4; border-radius: 12px; text-align: center;">
    <p style="margin: 0 0 4px; font-size: 12px; color: #666; text-transform: uppercase;">Número do Pedido</p>
    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a;">#${data.order_number}</p>
  </div>
  <div style="padding: 24px;">
    <p style="margin: 0 0 8px; font-size: 15px;"><strong>👤</strong> ${data.customer_name}</p>
    <p style="margin: 0 0 8px; font-size: 15px;"><strong>📱</strong> ${data.customer_phone}</p>
    <p style="margin: 0; font-size: 15px;"><strong>${deliveryInfo}</strong></p>
  </div>
  <div style="margin: 0 24px; padding: 16px; background-color: #dcfce7; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 16px; color: #166534; font-weight: bold;">🎉 Seu pedido já está sendo preparado!</p>
  </div>
  <div style="padding: 24px;"><table style="width: 100%; border-collapse: collapse;">${itemsHtml}</table></div>
  <div style="margin: 0 24px 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
    <div style="display: flex; justify-content: space-between; padding-top: 12px; font-size: 18px; font-weight: bold;"><span>Total Pago</span><span style="color: #16a34a;">R$ ${data.total.toFixed(2).replace('.', ',')}</span></div>
  </div>
  <div style="padding: 0 24px 16px; text-align: center;">
    <a href="${baseUrl}/pedido/${data.order_number}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">📦 Acompanhar Pedido</a>
  </div>
  <div style="padding: 0 24px 32px; text-align: center;">
    <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre meu pedido #${data.order_number}`)}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">💬 Falar com Atendente</a>
  </div>
  <div style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0 0 8px; font-size: 13px; color: #666;">📞 WhatsApp: ${whatsappFormatted}</p>
    <p style="margin: 0; font-size: 12px; color: #999;">Este é um e-mail automático.</p>
  </div>
</div></body></html>`;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-approved function called");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data: OrderApprovedRequest = await req.json();
    if (!data.order_number || !data.customer_email || !data.customer_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const branding = await getTenantBranding(supabase, data.tenant_id);
    const baseUrl = getTenantBaseUrl(branding);
    const whatsappCreds = await getWhatsAppCredentials(supabase, data.tenant_id);
    const emailCreds = await getEmailCredentials(supabase, data.tenant_id);

    const results = { email: { success: false, error: null as string | null }, whatsapp: { success: false, error: null as string | null } };

    // Send Email
    try {
      const resend = new Resend(emailCreds.apiKey);
      const html = generateEmailHtml(data, branding.brand_name, branding.whatsapp, branding.whatsapp_formatted, baseUrl);
      const { data: emailResponse, error } = await resend.emails.send({
        from: `${branding.brand_name} <${emailCreds.fromEmail}>`,
        to: [data.customer_email],
        subject: `Pedido #${data.order_number} Confirmado! ✅ - ${branding.brand_name}`,
        html,
      });

      if (error) {
        results.email.error = error.message;
        await supabase.from('notification_events').insert({ channel: 'email', event_type: 'failed', order_number: data.order_number, recipient_email: data.customer_email, template_name: 'order_approved', tenant_id: data.tenant_id, metadata: { error: 'Erro interno' } });
      } else {
        results.email.success = true;
        await supabase.from('notification_events').insert({ channel: 'email', event_type: 'sent', order_number: data.order_number, recipient_email: data.customer_email, template_name: 'order_approved', tenant_id: data.tenant_id, message_id: emailResponse?.id });
      }
    } catch (emailError: any) {
      results.email.error = emailError.message;
    }

    // Send WhatsApp via Evolution API
    if (whatsappCreds && data.customer_phone) {
      try {
        const firstName = data.customer_name?.split(' ')[0] || 'cliente';
        const itemsList = formatItemsList(data.items);
        const message = `✅ *Pagamento Confirmado!*\n\nOlá ${firstName}! 🎉\n\nSeu pedido *#${data.order_number}* foi aprovado!\n\n📋 *Itens:* ${itemsList}\n💰 *Total:* ${formatCurrency(data.total)}\n\nSeu pedido já está sendo preparado! 👨‍🍳\n\nAcompanhe: ${baseUrl}/pedido/${data.order_number}\n\nObrigado pela preferência! 💚`;

        const whatsappResult = await sendWhatsAppText(data.customer_phone, message, whatsappCreds);

        results.whatsapp.success = whatsappResult.success;
        if (!whatsappResult.success) results.whatsapp.error = whatsappResult.error || 'Unknown error';

        await supabase.from('notification_events').insert({
          channel: 'whatsapp', event_type: whatsappResult.success ? 'sent' : 'failed',
          order_number: data.order_number, recipient_phone: data.customer_phone,
          template_name: 'order_approved', tenant_id: data.tenant_id,
          message_id: whatsappResult.messageId,
          metadata: { response: whatsappResult.response, error: whatsappResult.error }
        });
      } catch (whatsappError: any) {
        results.whatsapp.error = whatsappError.message;
      }
    }

    return new Response(JSON.stringify({ success: results.email.success || results.whatsapp.success, results }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in send-order-approved:", error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
