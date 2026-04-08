import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const MAX_RETRIES = 2;
const RECENT_ORDER_WINDOW_MS = 15 * 60 * 1000;

interface OrderReservationPayload {
  status?: string;
  payment_method?: string;
  items?: unknown[];
  subtotal?: number;
  delivery_fee?: number;
  total?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  delivery_option?: string;
  delivery_address?: string | null;
  utm_data?: Record<string, unknown> | null;
  coupon_code?: string | null;
  discount_amount?: number;
  tenant_id?: string;
}

const normalizeNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: OrderReservationPayload = await req.json();
    const effectiveTenantId = body.tenant_id || DEFAULT_TENANT_ID;
    const customerName = body.customer_name?.trim() || "";
    const customerEmail = body.customer_email?.trim().toLowerCase() || "";
    const customerPhone = body.customer_phone?.trim() || "";
    const items = Array.isArray(body.items) ? body.items : [];
    const total = normalizeNumber(body.total);

    if (!customerName || !customerEmail || !customerPhone || items.length === 0 || total <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados do pedido incompletos." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const orderPayload = {
      status: body.status || "awaiting_payment",
      payment_method: body.payment_method || "pending",
      items,
      subtotal: normalizeNumber(body.subtotal, total),
      delivery_fee: normalizeNumber(body.delivery_fee),
      total,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      delivery_option: body.delivery_option || "pickup",
      delivery_address: body.delivery_address || null,
      utm_data: body.utm_data || null,
      coupon_code: body.coupon_code || null,
      discount_amount: normalizeNumber(body.discount_amount),
      tenant_id: effectiveTenantId,
    };

    const recentThreshold = new Date(Date.now() - RECENT_ORDER_WINDOW_MS).toISOString();
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("tenant_id", effectiveTenantId)
      .eq("customer_email", customerEmail)
      .eq("status", "awaiting_payment")
      .gte("created_at", recentThreshold)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOrderError) {
      throw existingOrderError;
    }

    if (existingOrder) {
      const { error: updateError } = await supabase
        .from("orders")
        .update(orderPayload)
        .eq("id", existingOrder.id);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          order_id: existingOrder.id,
          order_number: existingOrder.order_number,
          reused: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let createdOrder: { id: string; order_number: string | null } | null = null;
    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { data, error } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id, order_number")
        .single();

      if (!error && data) {
        createdOrder = data;
        break;
      }

      lastError = error;

      if (error?.code === "23505" && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      throw error;
    }

    if (!createdOrder) {
      throw lastError || new Error("Falha ao reservar pedido");
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: createdOrder.id,
        order_number: createdOrder.order_number,
        reused: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in create-order-reservation:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro ao reservar pedido. Tente novamente.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
