import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_API = "https://api.infinitepay.io/invoices/public/checkout/links";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { items, customer, delivery, tenant_id } = body;

    if (!items || !items.length) {
      throw new Error("Nenhum item informado");
    }

    // Get tenant handle (or use default)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Default handle
    let handle = "dletajavca";

    // Build items in InfinitePay format (price in cents)
    const infiniteItems = items.map((item: { name: string; quantity: number; totalPrice: number }) => ({
      description: item.name,
      quantity: item.quantity || 1,
      price: Math.round((item.totalPrice || 0) * 100), // Convert to cents
    }));

    const totalCents = infiniteItems.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity, 0);
    const totalReais = Math.round(totalCents) / 100;

    // Create order in database first
    const orderData = {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      items: JSON.stringify(items),
      subtotal: totalReais,
      total: totalReais,
      delivery_option: delivery?.option || "delivery",
      delivery_address: delivery?.address || null,
      delivery_fee: delivery?.fee || 0,
      status: "pending",
      payment_method: "infinitepay",
      tenant_id: tenant_id || null,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw new Error("Erro ao criar pedido: " + orderError.message);
    }

    // Build redirect URL
    const projectId = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1] || "";
    const siteUrl = `https://${projectId}.supabase.co`;
    
    // Use the order_number as order_nsu for tracking
    const orderNsu = order.order_number || order.id;

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    // Build InfinitePay payload
    const payload: Record<string, unknown> = {
      handle,
      items: infiniteItems,
      order_nsu: orderNsu,
      redirect_url: body.redirect_url || null,
      webhook_url: webhookUrl,
    };

    // Add customer data if available
    if (customer) {
      payload.customer = {
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone?.startsWith("+55") ? customer.phone : `+55${customer.phone}`,
      };
    }

    // Add address if available
    if (delivery?.address) {
      payload.address = {
        street: delivery.address,
      };
    }

    console.log("InfinitePay payload:", JSON.stringify(payload));

    // Call InfinitePay API
    const response = await fetch(INFINITEPAY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log("InfinitePay response:", JSON.stringify(responseData));

    if (!response.ok) {
      // Log error
      await supabase.from("payment_error_logs").insert({
        order_id: order.id,
        provider: "infinitepay",
        error_code: response.status.toString(),
        error_message: JSON.stringify(responseData),
        customer_email: customer.email,
        customer_phone: customer.phone,
        request_payload: payload,
        response_payload: responseData,
        tenant_id: tenant_id || null,
      });
      throw new Error(`InfinitePay error [${response.status}]: ${JSON.stringify(responseData)}`);
    }

    // The API returns a checkout URL
    const checkoutUrl = responseData.url || responseData.checkout_url || responseData.link;

    if (!checkoutUrl) {
      console.error("No checkout URL in response:", responseData);
      throw new Error("InfinitePay não retornou link de checkout");
    }

    // Update order with payment reference
    await supabase
      .from("orders")
      .update({
        mp_preference_id: responseData.slug || null,
        mp_payment_id: orderNsu,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        order_id: order.id,
        order_number: order.order_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
