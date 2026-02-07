import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
}

function generateEmailHtml(data: OrderPendingRequest, brandName: string, city: string, whatsapp: string, whatsappFormatted: string): string {
  const itemsHtml = data.items.map(item => {
    let flavorsHtml = '';
    if (item.flavors && item.flavors.length > 0) {
      flavorsHtml = `<div style="font-size: 12px; color: #666; margin-top: 4px;">
        ${item.flavors.map(f => `${f.quantity}x ${f.flavor}`).join(', ')}
      </div>`;
    }
    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <strong>${item.quantity}x ${item.name}</strong>
          ${flavorsHtml}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">
          R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}
        </td>
      </tr>
    `;
  }).join('');

  const deliveryText = data.delivery_option === 'delivery' 
    ? `Entrega em: ${data.delivery_address}` 
    : 'Retirada no local';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🥗 ${brandName}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Alimentação saudável em ${city}</p>
    </div>

    <!-- Badge -->
    <div style="text-align: center; padding: 30px 20px 10px;">
      <div style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px;">
        ⏳ AGUARDANDO PAGAMENTO
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 20px 30px;">
      <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 24px; text-align: center;">
        Seu pedido foi separado!
      </h2>
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 25px;">
        Olá <strong>${data.customer_name}</strong>! 🎉<br><br>
        Parabéns pela escolha! Já <strong>separamos os itens</strong> do seu pedido.<br>
        Falta apenas o <strong>pagamento</strong> para confirmarmos e começarmos a preparar!
      </p>

      <!-- Order Number -->
      <div style="background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 25px;">
        <p style="margin: 0; color: #9a3412; font-size: 14px;">Número do Pedido</p>
        <p style="margin: 5px 0 0 0; color: #ea580c; font-size: 28px; font-weight: bold;">#${data.order_number}</p>
      </div>

      <!-- Order Summary -->
      <div style="background-color: #f9fafb; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📦 Resumo do Pedido</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHtml}
          <tr>
            <td style="padding: 12px 0; color: #6b7280;">Subtotal</td>
            <td style="padding: 12px 0; text-align: right; color: #6b7280;">R$ ${data.subtotal.toFixed(2).replace('.', ',')}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #6b7280;">Taxa de Entrega</td>
            <td style="padding: 12px 0; text-align: right; color: #6b7280;">${data.delivery_fee > 0 ? `R$ ${data.delivery_fee.toFixed(2).replace('.', ',')}` : 'Grátis'}</td>
          </tr>
          <tr>
            <td style="padding: 15px 0 0 0; font-size: 18px; font-weight: bold; color: #1f2937; border-top: 2px solid #e5e7eb;">Total</td>
            <td style="padding: 15px 0 0 0; text-align: right; font-size: 18px; font-weight: bold; color: #16a34a; border-top: 2px solid #e5e7eb;">R$ ${data.total.toFixed(2).replace('.', ',')}</td>
          </tr>
        </table>
      </div>

      <!-- Delivery Info -->
      <div style="background-color: #f0fdf4; border-radius: 10px; padding: 15px 20px; margin-bottom: 25px;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          🚗 <strong>${deliveryText}</strong>
        </p>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align: center; margin-bottom: 25px;">
        <p style="color: #4b5563; margin-bottom: 20px; font-size: 14px;">
          Escolha como deseja efetuar o pagamento:
        </p>
        
        <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Quero pagar o pedido #${data.order_number} via PIX.`)}" 
           style="display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;">
          💳 Pagar via PIX
        </a>
        
        <a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Meu pedido #${data.order_number} foi separado. Gostaria de falar com um atendente.`)}" 
           style="display: inline-block; background-color: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;">
          💬 Falar no WhatsApp
        </a>
      </div>

      <!-- Warning -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ⚠️ <strong>Importante:</strong> Seu pedido ficará reservado por 24 horas. Após esse período, os itens poderão ser liberados para outros clientes.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #1f2937; padding: 25px 20px; text-align: center;">
      <p style="color: #9ca3af; margin: 0; font-size: 14px;">
        ${brandName} - Alimentação Saudável<br>
        ${city}
      </p>
      <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 12px;">
        Dúvidas? Fale conosco: ${whatsappFormatted}
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] send-order-pending-email function STARTED`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const data: OrderPendingRequest = JSON.parse(rawBody);
    console.log(`[${timestamp}] Parsed order data for ${data.order_number}`);

    if (!data.order_number || !data.customer_email || !data.customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant branding
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get tenant_id from the request body or from the order
    let tenantId = data.tenant_id;
    if (!tenantId && data.order_id) {
      const { data: orderData } = await supabase.from('orders').select('tenant_id').eq('id', data.order_id).maybeSingle();
      tenantId = orderData?.tenant_id;
    }

    const branding = await getTenantBranding(supabase, tenantId);

    const html = generateEmailHtml(data, branding.brand_name, branding.city, branding.whatsapp, branding.whatsapp_formatted);

    console.log(`[${timestamp}] Sending email to: ${data.customer_email}`);

    const emailResponse = await resend.emails.send({
      from: `${branding.brand_name} <pedidos@dietajavca.com.br>`,
      to: [data.customer_email],
      subject: `Pedido #${data.order_number} Separado - Aguardando Pagamento`,
      html: html,
    });

    console.log(`[${timestamp}] Email sent successfully to ${data.customer_email}`);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error(`Error in send-order-pending-email:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
