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
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatItemsList(items: OrderItem[]): string {
  return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
}

// Send WhatsApp template message
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
    
    console.log(`[WHATSAPP] Sending template "${templateId}" to ${formattedPhone} for order ${orderNumber}`);
    console.log(`[WHATSAPP] Fields:`, JSON.stringify(fields));

    const payload = {
      from: channelToken,
      to: formattedPhone,
      contents: [{
        type: 'template',
        templateId: templateId,
        fields: fields
      }],
    };

    console.log(`[WHATSAPP] Full payload:`, JSON.stringify(payload));

    const response = await fetch('https://api.notificame.com.br/v1/channels/whatsapp/messages', {
      method: 'POST',
      headers: {
        'X-Api-Token': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {}
    console.log(`[WHATSAPP] NotificaMe FULL response for ${orderNumber}:`, JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      body: responseJson || responseText,
      headers: Object.fromEntries(response.headers.entries())
    }));

    if (!response.ok) {
      return { success: false, error: `NotificaMe API error: ${response.status} - ${responseText}` };
    }

    console.log(`[WHATSAPP] Template sent successfully for order ${orderNumber}`);
    return { success: true };
  } catch (error: any) {
    console.error('[WHATSAPP] Error sending template:', error);
    return { success: false, error: error.message };
  }
}

const generateEmailHtml = (data: OrderApprovedRequest): string => {
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

  const paymentMethodText = data.payment_method === 'pix' ? 'PIX' : 'Mercado Pago';

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
            ✅
          </div>
          <h2 style="margin: 16px 0 8px; color: #16a34a; font-size: 24px;">Pedido Confirmado!</h2>
          <p style="margin: 0; font-size: 14px; color: #666;">Pagamento recebido com sucesso via ${paymentMethodText}</p>
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

        <!-- Status Badge -->
        <div style="margin: 0 24px; padding: 16px; background-color: #dcfce7; border-radius: 8px; text-align: center; border: 2px solid #22c55e;">
          <p style="margin: 0; font-size: 16px; color: #166534; font-weight: bold;">🎉 Seu pedido já está sendo preparado!</p>
        </div>

        <!-- Items Table -->
        <div style="padding: 24px;">
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
            <span>Total Pago</span>
            <span style="color: #16a34a;">R$ ${data.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <!-- Track Order Button -->
        <div style="padding: 0 24px 16px; text-align: center;">
          <a href="https://dietaja.com.br/pedido/${data.order_number}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            📦 Acompanhar Pedido
          </a>
        </div>

        <!-- WhatsApp Button -->
        <div style="padding: 0 24px 32px; text-align: center;">
          <p style="margin: 0 0 16px; font-size: 14px; color: #666;">Dúvidas sobre seu pedido?</p>
          <a href="https://wa.me/5577991001658?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20meu%20pedido%20%23${data.order_number}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
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
  console.log("send-order-approved function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: OrderApprovedRequest = await req.json();
    console.log("Order approved request:", JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.order_number || !data.customer_email || !data.customer_name) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_number, customer_email, customer_name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = {
      email: { success: false, error: null as string | null },
      whatsapp: { success: false, error: null as string | null }
    };

    // Send Email
    try {
      const html = generateEmailHtml(data);
      console.log(`[EMAIL] Sending approved email to ${data.customer_email}`);

      const { data: emailResponse, error } = await resend.emails.send({
        from: "Dieta Já <pedidos@dietajavca.com.br>",
        to: [data.customer_email],
        subject: `Pedido #${data.order_number} Confirmado! ✅ - Dieta Já`,
        html,
      });

      if (error) {
        console.error("[EMAIL] Resend error:", error);
        results.email.error = error.message;
      } else {
        console.log("[EMAIL] Approved email sent successfully:", emailResponse);
        results.email.success = true;
      }
    } catch (emailError: any) {
      console.error("[EMAIL] Error sending email:", emailError);
      results.email.error = emailError.message;
    }

    // Send WhatsApp using template compraa_confrimadaa
    const notificameApiToken = Deno.env.get("NOTIFICAME_API_TOKEN");
    const notificameChannelToken = Deno.env.get("NOTIFICAME_WHATSAPP_CHANNEL_TOKEN");

    if (notificameApiToken && notificameChannelToken && data.customer_phone) {
      try {
        // Template compraa_confrimadaa has 4 variables:
        // {{1}} = nome, {{2}} = pedido, {{3}} = itens, {{4}} = total
        const templateFields = {
          "1": data.customer_name?.split(' ')[0] || 'cliente',
          "2": data.order_number,
          "3": formatItemsList(data.items),
          "4": formatCurrency(data.total)
        };

        console.log(`[WHATSAPP] Sending compraa_confrimadaa to ${data.customer_phone}`);
        
        const whatsappResult = await sendWhatsAppTemplate(
          data.customer_phone,
          'compraa_confrimadaa',
          templateFields,
          notificameApiToken,
          notificameChannelToken,
          data.order_number
        );

        results.whatsapp.success = whatsappResult.success;
        if (!whatsappResult.success) {
          results.whatsapp.error = whatsappResult.error || 'Unknown error';
        }
      } catch (whatsappError: any) {
        console.error("[WHATSAPP] Error sending WhatsApp:", whatsappError);
        results.whatsapp.error = whatsappError.message;
      }
    } else {
      console.warn("[WHATSAPP] NotificaMe credentials not configured or no phone - WhatsApp skipped");
      results.whatsapp.error = "Credentials not configured or no phone";
    }

    console.log("send-order-approved completed:", results);

    return new Response(
      JSON.stringify({ 
        success: results.email.success || results.whatsapp.success,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-approved function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
