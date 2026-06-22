import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  code: string;
  customer_email: string;
  subtotal: number;
  tenant_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { code, customer_email, subtotal, tenant_id } = body;
    const effectiveTenantId = tenant_id || '00000000-0000-0000-0000-000000000001';

    const couponCode = code.trim().toUpperCase();
    
    if (!couponCode) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Código do cupom é obrigatório' }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating coupon: ${couponCode} for email: ${customer_email}`);

    // First, check in coupons table (standalone coupons)
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode)
      .eq('is_active', true)
      .eq('tenant_id', effectiveTenantId)
      .maybeSingle();

    if (couponError) {
      console.error('Error fetching coupon:', couponError);
      throw couponError;
    }

    let discountType = 'percent';
    let discountValue = 0;
    let minOrderValue = 0;
    let maxUsesPerCustomer = 1;
    let maxUses: number | null = null;
    let currentUses = 0;
    let validUntil: string | null = null;
    let validFrom: string | null = null;
    let source: 'coupon' | 'marketing' = 'coupon';

    if (coupon) {
      // Found in coupons table
      discountType = coupon.discount_type;
      discountValue = coupon.discount_value;
      minOrderValue = coupon.min_order_value || 0;
      maxUsesPerCustomer = coupon.max_uses_per_customer || 1;
      maxUses = coupon.max_uses;
      currentUses = coupon.current_uses || 0;
      validUntil = coupon.valid_until;
      validFrom = coupon.valid_from;
      source = 'coupon';
    } else {
      // Not found in coupons, check marketing_messages
      const { data: marketingCoupon, error: marketingError } = await supabase
        .from('marketing_messages')
        .select('*')
        .eq('coupon_code', couponCode)
        .eq('is_active', true)
        .eq('tenant_id', effectiveTenantId)
        .maybeSingle();

      if (marketingError) {
        console.error('Error fetching marketing coupon:', marketingError);
        throw marketingError;
      }

      if (!marketingCoupon) {
        return new Response(
          JSON.stringify({ valid: false, message: 'Cupom inválido' }),
          { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Marketing coupons are always percentage based
      discountType = 'percent';
      discountValue = marketingCoupon.discount_percent || 0;
      minOrderValue = 0;
      maxUsesPerCustomer = 1;
      source = 'marketing';
    }

    const now = new Date();

    // Check validity period
    if (validFrom && new Date(validFrom) > now) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Este cupom ainda não está válido' }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (validUntil && new Date(validUntil) < now) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Este cupom expirou' }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Check global usage limit (only for standalone coupons)
    if (source === 'coupon' && maxUses !== null && currentUses >= maxUses) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Este cupom atingiu o limite de usos' }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Check per-customer usage limit
    const { count: customerUsageCount, error: usageError } = await supabase
      .from('coupon_usage')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_code', couponCode)
      .eq('customer_email', customer_email.toLowerCase());

    if (usageError) {
      console.error('Error checking customer usage:', usageError);
      throw usageError;
    }

    if (customerUsageCount !== null && customerUsageCount >= maxUsesPerCustomer) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Você já utilizou este cupom' }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum order value
    if (subtotal < minOrderValue) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: `Pedido mínimo de R$ ${minOrderValue.toFixed(2).replace('.', ',')} para usar este cupom` 
        }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }

    console.log(`Coupon valid: ${couponCode}, discount: R$ ${discountAmount.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        valid: true,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        message: discountType === 'percent' 
          ? `Cupom ${couponCode} aplicado! ${discountValue}% de desconto`
          : `Cupom ${couponCode} aplicado! R$ ${discountValue.toFixed(2).replace('.', ',')} de desconto`,
      }),
      { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating coupon:', error);
    return new Response(
      JSON.stringify({ valid: false, message: 'Erro ao validar cupom. Tente novamente.' }),
      { status: 500, headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
