import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

interface FlavorItem {
  name: string;
  quantity: number;
  category?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  type: string;
  flavors?: FlavorItem[];
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error('order_id is required');
    }

    console.log(`[decrement-stock] Processing order: ${order_id}`);

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, items, stock_decremented, tenant_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('[decrement-stock] Order not found:', orderError);
      throw new Error('Order not found');
    }

    // Check if stock was already decremented
    if (order.stock_decremented) {
      console.log(`[decrement-stock] Stock already decremented for order ${order_id}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Stock already decremented' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const items = order.items as OrderItem[];
    const decrementResults: string[] = [];

    // Process each item
    for (const item of items) {
      if (!item.flavors || item.flavors.length === 0) {
        console.log(`[decrement-stock] No flavors for item: ${item.name}`);
        continue;
      }

      for (const flavor of item.flavors) {
        const flavorName = flavor.name;
        const flavorQuantity = flavor.quantity;
        const flavorCategory = flavor.category?.toLowerCase();

        let tableName: string;
        
        // Determine which table to update based on category
        if (flavorCategory === 'suco' || flavorCategory === 'juice') {
          tableName = 'kit_juices';
        } else if (flavorCategory === 'sopa' || flavorCategory === 'soup') {
          tableName = 'kit_soups';
        } else {
          // Default to marmita_flavors for carnes, frangos, massas, especiais
          tableName = 'marmita_flavors';
        }

        console.log(`[decrement-stock] Decrementing ${flavorQuantity}x "${flavorName}" from ${tableName}`);

        // Get current stock
        const { data: currentItem, error: fetchError } = await supabase
          .from(tableName)
          .select('id, name, stock_quantity')
          .eq('name', flavorName)
          .eq('tenant_id', order.tenant_id || '00000000-0000-0000-0000-000000000001')
          .maybeSingle();

        if (fetchError) {
          console.error(`[decrement-stock] Error fetching ${flavorName} from ${tableName}:`, fetchError);
          continue;
        }

        if (!currentItem) {
          console.warn(`[decrement-stock] Flavor not found: "${flavorName}" in ${tableName}`);
          continue;
        }

        // Only decrement if stock_quantity is set (not null)
        if (currentItem.stock_quantity === null) {
          console.log(`[decrement-stock] No stock tracking for "${flavorName}"`);
          continue;
        }

        const newStock = Math.max(0, currentItem.stock_quantity - flavorQuantity);

        const { error: updateError } = await supabase
          .from(tableName)
          .update({ stock_quantity: newStock })
          .eq('id', currentItem.id);

        if (updateError) {
          console.error(`[decrement-stock] Error updating stock for ${flavorName}:`, updateError);
        } else {
          decrementResults.push(`${flavorName}: ${currentItem.stock_quantity} → ${newStock}`);
          console.log(`[decrement-stock] Updated "${flavorName}": ${currentItem.stock_quantity} → ${newStock}`);

          // Log stock movement
          const itemType = tableName === 'kit_juices' ? 'kit_juice' : 
                          tableName === 'kit_soups' ? 'kit_soup' : 'marmita_flavor';
          
          await supabase.from('stock_movements').insert({
            item_type: itemType,
            item_id: currentItem.id,
            item_name: flavorName,
            movement_type: 'sale',
            quantity_before: currentItem.stock_quantity,
            quantity_after: newStock,
            quantity_change: -flavorQuantity,
            notes: `Pedido #${order_id.slice(0, 8)}`,
            tenant_id: order.tenant_id || '00000000-0000-0000-0000-000000000001',
          });
        }
      }
    }

    // Mark order as stock decremented
    const { error: markError } = await supabase
      .from('orders')
      .update({ stock_decremented: true })
      .eq('id', order_id);

    if (markError) {
      console.error('[decrement-stock] Error marking order as decremented:', markError);
    }

    console.log(`[decrement-stock] Completed for order ${order_id}. Changes: ${decrementResults.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id,
        decremented: decrementResults 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[decrement-stock] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao processar estoque' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
