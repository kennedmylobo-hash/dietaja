import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWhatsAppCredentials } from "../_shared/tenant-credentials.ts";
import { sendWhatsAppText } from "../_shared/evolution-sender.ts";
import { getTenantBranding } from "../_shared/tenant-branding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[cancel-expired-pix] Checking for expired PIX orders...");

    // Find orders with expired PIX
    const { data: expiredOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, status, tenant_id, total")
      .in("status", ["pending", "whatsapp_pending"])
      .not("pix_expiration", "is", null)
      .lt("pix_expiration", new Date().toISOString());

    if (fetchError) {
      console.error("[cancel-expired-pix] Error fetching orders:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log("[cancel-expired-pix] No expired PIX orders found");
      return new Response(JSON.stringify({ cancelled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[cancel-expired-pix] Found ${expiredOrders.length} expired orders`);

    let cancelledCount = 0;

    for (const order of expiredOrders) {
      try {
        // Update order status
        const { error: updateError } = await supabase
          .from("orders")
          .update({ status: "cancelled", cancellation_type: "pix_expired" })
          .eq("id", order.id);

        if (updateError) {
          console.error(`[cancel-expired-pix] Error updating order ${order.order_number}:`, updateError);
          continue;
        }

        // Record in status history
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          previous_status: order.status,
          new_status: "cancelled",
          changed_by_name: "Sistema",
          notes: "PIX expirado - cancelado automaticamente",
          tenant_id: order.tenant_id || "00000000-0000-0000-0000-000000000001",
        });

        // Send WhatsApp notification to customer
        if (order.customer_phone) {
          const whatsappCreds = await getWhatsAppCredentials(supabase, order.tenant_id);
          if (whatsappCreds) {
            const branding = await getTenantBranding(supabase, order.tenant_id);
            const firstName = order.customer_name?.split(" ")[0] || "Cliente";
            const message = `⏰ Olá ${firstName}!\n\nO prazo para pagamento do seu pedido *#${order.order_number}* expirou e ele foi cancelado automaticamente.\n\nSe ainda deseja fazer o pedido, acesse nosso site e faça um novo! 😊\n\n${branding.name}`;
            
            await sendWhatsAppText(order.customer_phone, message, whatsappCreds);
            console.log(`[cancel-expired-pix] ✅ WhatsApp sent to ${order.customer_phone}`);
          }
        }

        cancelledCount++;
        console.log(`[cancel-expired-pix] ✅ Cancelled order ${order.order_number}`);
      } catch (orderError) {
        console.error(`[cancel-expired-pix] Error processing order ${order.order_number}:`, orderError);
      }
    }

    console.log(`[cancel-expired-pix] Done. Cancelled ${cancelledCount} orders.`);

    return new Response(JSON.stringify({ cancelled: cancelledCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[cancel-expired-pix] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
