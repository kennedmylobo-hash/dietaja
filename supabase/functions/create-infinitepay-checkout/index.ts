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
    const { items, customer, delivery, tenant_id, existing_order_id } = body;

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
    // IMPORTANT: item.totalPrice already includes quantity, so we set quantity=1
    // to avoid double-multiplying (e.g. 28x kit at R$641 would become R$17,953)
    const infiniteItems = items.map((item: { name: string; quantity: number; totalPrice: number }) => ({
      description: `${item.quantity > 1 ? item.quantity + 'x ' : ''}${item.name}`,
      quantity: 1,
      price: Math.round((item.totalPrice || 0) * 100), // Convert to cents — already includes qty
    }));

    const totalCents = infiniteItems.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity, 0);
    const totalReais = Math.round(totalCents) / 100;

    let order: { id: string; order_number: string | null };

    if (existing_order_id) {
      // Reuse existing order — just update payment method
      const { data: existingOrder, error: fetchError } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("id", existing_order_id)
        .single();

      if (fetchError || !existingOrder) {
        console.error("Existing order not found:", fetchError);
        throw new Error("Pedido não encontrado: " + (fetchError?.message || existing_order_id));
      }

      await supabase
        .from("orders")
        .update({ payment_method: "infinitepay" })
        .eq("id", existing_order_id);

      order = existingOrder;
    } else {
      // Create order in database
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

      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select("id, order_number")
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error("Erro ao criar pedido: " + orderError.message);
      }

      order = newOrder;
    }

    // Build redirect URL
    const projectId = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1] || "";
    const siteUrl = `https://${projectId}.supabase.co`;
    
    // Use the order_number as order_nsu for tracking
    const orderNsu = order.order_number || order.id;

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    // Append order_id to redirect URL so PagamentoSucesso can track Purchase
    let finalRedirectUrl = body.redirect_url || null;
    if (finalRedirectUrl) {
      const separator = finalRedirectUrl.includes('?') ? '&' : '?';
      finalRedirectUrl = `${finalRedirectUrl}${separator}order_id=${order.id}`;
    }

    // Build InfinitePay payload
    const payload: Record<string, unknown> = {
      handle,
      items: infiniteItems,
      order_nsu: orderNsu,
      redirect_url: finalRedirectUrl,
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
        error: "Erro ao processar pagamento. Tente novamente.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
