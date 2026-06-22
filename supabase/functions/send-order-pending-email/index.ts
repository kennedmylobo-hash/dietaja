import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";
import { getEmailCredentials } from "../_shared/tenant-credentials.ts";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  flavors?: { flavor: string; quantity: number }[];
}

interface OrderPendingRequest {
  order_number: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_option: string;
  delivery_address?: string;
  order_id?: string;
  tenant_id?: string;
  pix_qr_code?: string;
  pix_qr_code_base64?: string;
  pix_expiration?: string;
}

function generateEmailHtml(data: OrderPendingRequest, brandName: string, city: string, whatsapp: string, whatsappFormatted: string): string {
  const pixSection = data.pix_qr_code_base64 ? `
    <div style="text-align: center; margin-bottom: 25px;">
      <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px;">💳 PAGUE VIA PIX</h3>
      <div style="background: #fff; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; display: inline-block;">
        <img src="data:image/png;base64,${data.pix_qr_code_base64}" alt="PIX QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto 15px;" />
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">Ou copie o código PIX abaixo:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 12px; font-size: 11px; color: #374151; word-break: break-all; font-family: monospace; margin-bottom: 10px;">${data.pix_qr_code || ''}</div>
        <button onclick="navigator.clipboard.writeText('${(data.pix_qr_code || '').replace(/'/g, "\\'")}')" style="background: #16a34a; color: #fff; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: bold; cursor: pointer;">📋 Copiar código PIX</button>
      </div>
      ${data.pix_expiration ? `<p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">⏳ Válido até ${new Date(data.pix_expiration).toLocaleString('pt-BR')}</p>` : ''}
    </div>` : '';
  const itemsHtml = data.items.map(item => {
    let flavorsHtml = '';
    if (item.flavors && item.flavors.length > 0) {
      flavorsHtml = `<div style="font-size: 12px; color: #666; margin-top: 4px;">${item.flavors.map(f => `${f.quantity}x ${f.flavor}`).join(', ')}</div>`;
    }
    return `<tr><td style="padding: 12px 0; border-bottom: 1px solid #eee;"><strong>${item.quantity}x ${item.name}</strong>${flavorsHtml}</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</td></tr>`;
  }).join('');

  const deliveryText = data.delivery_option === 'delivery' ? `Entrega em: ${data.delivery_address}` : 'Retirada no local';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🥗 ${brandName}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Alimentação saudável em ${city}</p>
  </div>
  <div style="text-align: center; padding: 30px 20px 10px;">
    <div style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px;">⏳ AGUARDANDO PAGAMENTO</div>
  </div>
  <div style="padding: 20px 30px;">
    <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 24px; text-align: center;">Seu pedido foi separado!</h2>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 25px;">Olá <strong>${data.customer_name}</strong>! 🎉<br><br>Parabéns pela escolha! Já <strong>separamos os itens</strong> do seu pedido.<br>Falta apenas o <strong>pagamento</strong> para confirmarmos e começarmos a preparar!</p>
    <div style="background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 25px;">
      <p style="margin: 0; color: #9a3412; font-size: 14px;">Número do Pedido</p>
      <p style="margin: 5px 0 0 0; color: #ea580c; font-size: 28px; font-weight: bold;">#${data.order_number}</p>
    </div>
    <div style="background-color: #f9fafb; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📦 Resumo do Pedido</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
        <tr><td style="padding: 12px 0; color: #6b7280;">Subtotal</td><td style="padding: 12px 0; text-align: right; color: #6b7280;">R$ ${data.subtotal.toFixed(2).replace('.', ',')}</td></tr>
        <tr><td style="padding: 12px 0; color: #6b7280;">Taxa de Entrega</td><td style="padding: 12px 0; text-align: right; color: #6b7280;">${data.delivery_fee > 0 ? `R$ ${data.delivery_fee.toFixed(2).replace('.', ',')}` : 'Grátis'}</td></tr>
        <tr><td style="padding: 15px 0 0 0; font-size: 18px; font-weight: bold; color: #1f2937; border-top: 2px solid #e5e7eb;">Total</td><td style="padding: 15px 0 0 0; text-align: right; font-size: 18px; font-weight: bold; color: #16a34a; border-top: 2px solid #e5e7eb;">R$ ${data.total.toFixed(2).replace('.', ',')}</td></tr>
      </table>
    </div>
    <div style="background-color: #f0fdf4; border-radius: 10px; padding: 15px 20px; margin-bottom: 25px;">
      <p style="margin: 0; color: #166534; font-size: 14px;">🚗 <strong>${deliveryText}</strong></p>
    </div>
    ${pixSection}
    <div style="text-align: center; margin-bottom: 25px;">
      <p style="color: #4b5563; margin-bottom: 20px; font-size: 14px;">Escolha como deseja efetuar o pagamento:</p>
      <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Quero pagar o pedido #${data.order_number} via PIX.`)}" style="display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;">💳 Pagar via PIX</a>
      <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Meu pedido #${data.order_number} foi separado. Gostaria de falar com um atendente.`)}" style="display: inline-block; background-color: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;">💬 Falar no WhatsApp</a>
    </div>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ <strong>Importante:</strong> Seu pedido ficará reservado por 24 horas.</p>
    </div>
  </div>
  <div style="background-color: #1f2937; padding: 25px 20px; text-align: center;">
    <p style="color: #9ca3af; margin: 0; font-size: 14px;">${brandName} - Alimentação Saudável<br>${city}</p>
    <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 12px;">Dúvidas? Fale conosco: ${whatsappFormatted}</p>
  </div>
</div></body></html>`;
}

const handler = async (req: Request): Promise<Response> => {
  console.log(`send-order-pending-email function STARTED`);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const data: OrderPendingRequest = JSON.parse(rawBody);

    if (!data.order_number || !data.customer_email || !data.customer_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let tenantId = data.tenant_id;
    if (!tenantId && data.order_id) {
      const { data: orderData } = await supabase.from('orders').select('tenant_id').eq('id', data.order_id).maybeSingle();
      tenantId = orderData?.tenant_id;
    }

    // === ATOMIC DEDUP (23505 = unique violation = já enviado) ===
    const { error: claimError } = await supabase
      .from('notification_events')
      .insert({ channel: 'email', event_type: 'sent', order_number: data.order_number, recipient_email: data.customer_email, template_name: 'order_pending', tenant_id: tenantId })
      .select('id')
      .single();

    if (claimError?.code === '23505') {
      console.log('Pending email already sent for order', data.order_number, '— skipping');
      return new Response(JSON.stringify({ success: true, skipped: true }), { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const branding = await getTenantBranding(supabase, tenantId);
    const emailCreds = await getEmailCredentials(supabase, tenantId);
    const resend = new Resend(emailCreds.apiKey);

    const html = generateEmailHtml(data, branding.brand_name, branding.city, branding.whatsapp, branding.whatsapp_formatted);
    console.log('Sending order pending email with PIX data:', { hasQR: !!data.pix_qr_code_base64, hasCode: !!data.pix_qr_code });

    const { error: sendError } = await resend.emails.send({
      from: `${branding.brand_name} <${emailCreds.fromEmail}>`,
      to: [data.customer_email],
      subject: `Pedido #${data.order_number} Separado - Aguardando Pagamento`,
      html,
    });
    if (sendError) throw sendError;
    console.log(`Email sent successfully to ${data.customer_email}`);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error(`Error in send-order-pending-email:`, error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } });
  }
};

serve(handler);
