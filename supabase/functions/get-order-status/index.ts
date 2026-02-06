import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  name: string;
  quantity: number;
}

interface OrderStatusResponse {
  order_number: string;
  status: string;
  customer_first_name: string;
  created_at: string;
  items: OrderItem[];
  total: number;
  delivery_option: string;
  paid_at: string | null;
  tracking_link: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get("order_number");

    if (!orderNumber) {
      console.error("Missing order_number parameter");
      return new Response(
        JSON.stringify({ error: "Número do pedido é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching order status for: ${orderNumber}`);

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order by order_number
    const { data: order, error } = await supabase
      .from("orders")
      .select("order_number, status, customer_name, created_at, items, total, delivery_option, paid_at, tracking_link")
      .eq("order_number", orderNumber.toUpperCase())
      .single();

    if (error || !order) {
      console.error("Order not found:", error);
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Order found: ${order.order_number}, status: ${order.status}`);

    // Extract first name only for privacy
    const firstName = order.customer_name?.split(" ")[0] || "Cliente";

    // Extract item names and quantities only
    const items: OrderItem[] = (order.items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
    }));

    const response: OrderStatusResponse = {
      order_number: order.order_number,
      status: order.status,
      customer_first_name: firstName,
      created_at: order.created_at,
      items,
      total: order.total,
      delivery_option: order.delivery_option,
      paid_at: order.paid_at,
      tracking_link: order.tracking_link,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching order status:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao buscar status do pedido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
