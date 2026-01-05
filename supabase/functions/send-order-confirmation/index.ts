import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  flavors?: Array<{
    name: string;
    quantity: number;
    category?: string;
  }>;
}

interface OrderConfirmationRequest {
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
}

const generateEmailHtml = (data: OrderConfirmationRequest): string => {
  const itemsHtml = data.items.map(item => {
    let flavorsHtml = '';
    if (item.flavors && item.flavors.length > 0) {
      flavorsHtml = `
        <div style="margin-top: 4px; padding-left: 12px; font-size: 12px; color: #666;">
          ${item.flavors.map(f => `• ${f.quantity}x ${f.name}`).join('<br>')}
        </div>
      `;
    }
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong>
          ${flavorsHtml}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;">
          R$ ${item.totalPrice.toFixed(2).replace('.', ',')}
        </td>
      </tr>
    `;
  }).join('');

  const deliveryInfo = data.delivery_option === 'pickup' 
    ? '📍 Retirada no local - Bairro Recreio'
    : `🛵 Entrega - ${data.delivery_address}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🥗 Dieta Já</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Alimentação saudável para sua rotina</p>
        </div>

        <!-- Success Badge -->
        <div style="text-align: center; padding: 32px 24px 16px;">
          <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">
            ✓
          </div>
          <h2 style="margin: 16px 0 8px; color: #16a34a; font-size: 24px;">Pedido Confirmado!</h2>
          <p style="margin: 0; font-size: 14px; color: #666;">Obrigado por escolher a Dieta Já</p>
        </div>

        <!-- Order Number -->
        <div style="margin: 0 24px; padding: 16px; background-color: #f0fdf4; border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Número do Pedido</p>
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #16a34a;">#${data.order_number}</p>
        </div>

        <!-- Customer Info -->
        <div style="padding: 24px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Dados do Cliente</h3>
          <p style="margin: 0 0 8px; font-size: 15px;"><strong>👤 Nome:</strong> ${data.customer_name}</p>
          <p style="margin: 0 0 8px; font-size: 15px;"><strong>📱 WhatsApp:</strong> ${data.customer_phone}</p>
          <p style="margin: 0; font-size: 15px;"><strong>${deliveryInfo}</strong></p>
        </div>

        <!-- Items Table -->
        <div style="padding: 0 24px 24px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Itens do Pedido</h3>
          <table style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; overflow: hidden;">
            ${itemsHtml}
          </table>
        </div>

        <!-- Totals -->
        <div style="margin: 0 24px 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Subtotal</span>
            <span>R$ ${data.subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          ${data.delivery_fee > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Taxa de Entrega</span>
            <span>R$ ${data.delivery_fee.toFixed(2).replace('.', ',')}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 18px; font-weight: bold;">
            <span>Total</span>
            <span style="color: #16a34a;">R$ ${data.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div style="padding: 0 24px 32px; text-align: center;">
          <p style="margin: 0 0 16px; font-size: 14px; color: #666;">Escolha como deseja prosseguir:</p>
          <a href="https://dietaja.com.br" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 12px;">
            💳 Pagar via PIX
          </a>
          <br>
          <a href="https://wa.me/5577991001658?text=Ol%C3%A1!%20Meu%20pedido%20%23${data.order_number}%20foi%20confirmado.%20Gostaria%20de%20falar%20com%20um%20atendente." style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            💬 Falar com Atendente
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #666;">
            📞 WhatsApp: (77) 99100-1658
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            Este é um e-mail automático. Por favor, não responda.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-confirmation function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: OrderConfirmationRequest = await req.json();
    console.log("Order confirmation request:", JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.order_number || !data.customer_email || !data.customer_name) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_number, customer_email, customer_name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const html = generateEmailHtml(data);

    console.log(`Sending email to ${data.customer_email}`);

    const { data: emailResponse, error } = await resend.emails.send({
      from: "Dieta Já <pedidos@dietajavca.com.br>",
      to: [data.customer_email],
      subject: `Pedido #${data.order_number} Confirmado! 🥗 - Dieta Já`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
