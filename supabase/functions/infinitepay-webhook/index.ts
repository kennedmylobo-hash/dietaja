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

    // Use 'approved' status to match Asaas flow and ensure visibility in admin panel
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "approved",
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

    // Record status history
    try {
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: "approved",
        changed_by_name: "InfinitePay Webhook",
        tenant_id: order.tenant_id,
      });
    } catch (e) {
      console.error("Error recording status history:", e);
    }

    // Decrement stock
    try {
      await supabase.functions.invoke("decrement-stock", {
        body: { order_id: order.id },
      });
    } catch (e) {
      console.error("Error decrementing stock:", e);
    }

    // Process cashback
    try {
      await supabase.functions.invoke("process-cashback", {
        body: {
          order_id: order.id,
          customer_email: order.customer_email,
          total: order.total,
          tenant_id: order.tenant_id,
        },
      });
    } catch (e) {
      console.error("Error processing cashback:", e);
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

    // Send order confirmation notification (with full context)
    try {
      await supabase.functions.invoke("send-order-approved", {
        body: {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          total: order.total,
          items: order.items,
          tenant_id: order.tenant_id,
        },
      });
    } catch (notifError) {
      console.error("Error sending notification:", notifError);
    }

    // Fire server-side Purchase event to Meta CAPI (backup for browser pixel)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/functions/v1/meta-capi`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          event_name: "Purchase",
          event_id: `purchase_${order.id}`,
          value: order.total,
          currency: "BRL",
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          source_url: `https://diet-on-demand.lovable.app/pagamento-sucesso?order_id=${order.id}`,
          tenant_id: order.tenant_id,
          custom_data: {
            order_id: order.id,
            payment_method: order.payment_method,
          },
        }),
      });
      console.log(`✅ Meta CAPI Purchase event sent for order ${order.order_number}`);
    } catch (capiError) {
      console.error("Error sending Meta CAPI:", capiError);
    }

    console.log(`Order ${order.order_number} marked as approved via InfinitePay (${capture_method})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
