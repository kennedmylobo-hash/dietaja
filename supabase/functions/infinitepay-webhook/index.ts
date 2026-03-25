import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("InfinitePay webhook received:", JSON.stringify(body));

    const {
      invoice_slug,
      amount,
      paid_amount,
      installments,
      capture_method,
      transaction_nsu,
      order_nsu,
      receipt_url,
    } = body;

    if (!order_nsu) {
      console.error("No order_nsu in webhook payload");
      return new Response(JSON.stringify({ error: "Missing order_nsu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find order by order_number or mp_payment_id
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("*")
      .or(`order_number.eq.${order_nsu},mp_payment_id.eq.${order_nsu}`)
      .single();

    if (findError || !order) {
      console.error("Order not found for order_nsu:", order_nsu, findError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order status to paid
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: capture_method === "pix" ? "pix" : "credit_card",
        mp_payment_id: transaction_nsu || order.mp_payment_id,
        tracking_link: receipt_url || null,
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log notification event
    await supabase.from("notification_events").insert({
      event_type: "payment_confirmed",
      channel: "webhook",
      order_id: order.id,
      order_number: order.order_number,
      recipient_email: order.customer_email,
      recipient_phone: order.customer_phone,
      tenant_id: order.tenant_id,
      metadata: {
        provider: "infinitepay",
        capture_method,
        transaction_nsu,
        invoice_slug,
        amount,
        paid_amount,
        installments,
      },
    });

    // Try to send order confirmation
    try {
      await supabase.functions.invoke("send-order-approved", {
        body: { order_id: order.id },
      });
    } catch (notifError) {
      console.error("Error sending notification:", notifError);
    }

    console.log(`Order ${order.order_number} marked as paid via InfinitePay (${capture_method})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
