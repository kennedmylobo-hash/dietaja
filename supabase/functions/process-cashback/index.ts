import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CreditCashbackRequest {
  order_id: string;
  customer_email: string;
  order_total: number;
}

interface UseCashbackRequest {
  order_id: string;
  customer_email: string;
  amount: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, tenant_id: reqTenantId, ...params } = await req.json();
    const effectiveTenantId = reqTenantId || '00000000-0000-0000-0000-000000000001';
    console.log(`[process-cashback] Action: ${action}, tenant: ${effectiveTenantId}`, params);

    if (action === 'credit') {
      // Credit cashback after order is approved
      const { order_id, customer_email, order_total } = params as CreditCashbackRequest;

      // Get or create customer balance
      let balance = await getOrCreateBalance(supabase, customer_email);

      // Get customer's current level
      const level = await getCustomerLevel(supabase, balance.total_orders, balance.total_spent, effectiveTenantId);
      if (!level) {
        console.error('[process-cashback] No loyalty levels configured');
        return new Response(
          JSON.stringify({ success: false, error: 'No loyalty levels configured' }),
          { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Calculate cashback amount
      const cashbackAmount = (order_total * level.cashback_percent) / 100;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 40); // 40 days validity

      // Update balance
      const newBalance = balance.current_balance + cashbackAmount;
      const { error: updateError } = await supabase
        .from('cashback_balances')
        .update({
          current_balance: newBalance,
          total_earned: balance.total_earned + cashbackAmount,
          total_orders: balance.total_orders + 1,
          total_spent: balance.total_spent + order_total,
          current_level_id: level.id,
        })
        .eq('customer_email', customer_email);

      if (updateError) {
        console.error('[process-cashback] Error updating balance:', updateError);
        throw updateError;
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('cashback_transactions')
        .insert({
          customer_email,
          order_id,
          transaction_type: 'earned',
          amount: cashbackAmount,
          balance_after: newBalance,
          expires_at: expiresAt.toISOString(),
          level_slug: level.slug,
          notes: `Cashback de ${level.cashback_percent}% no pedido`,
          tenant_id: effectiveTenantId,
        });

      if (txError) {
        console.error('[process-cashback] Error recording transaction:', txError);
      }

      console.log(`[process-cashback] Credited R$${cashbackAmount.toFixed(2)} to ${customer_email}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          cashback_credited: cashbackAmount,
          new_balance: newBalance,
          level: level.name,
        }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );

    } else if (action === 'use') {
      // Use cashback on an order
      const { order_id, customer_email, amount } = params as UseCashbackRequest;

      // Get current balance
      const { data: balance, error: balanceError } = await supabase
        .from('cashback_balances')
        .select('*')
        .eq('customer_email', customer_email)
        .single();

      if (balanceError || !balance) {
        console.error('[process-cashback] Balance not found for', customer_email);
        return new Response(
          JSON.stringify({ success: false, error: 'Balance not found' }),
          { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (balance.current_balance < amount) {
        console.error('[process-cashback] Insufficient balance');
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient balance' }),
          { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Deduct from balance
      const newBalance = balance.current_balance - amount;
      const { error: updateError } = await supabase
        .from('cashback_balances')
        .update({
          current_balance: newBalance,
          total_used: balance.total_used + amount,
        })
        .eq('customer_email', customer_email);

      if (updateError) {
        console.error('[process-cashback] Error updating balance:', updateError);
        throw updateError;
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('cashback_transactions')
        .insert({
          customer_email,
          order_id,
          transaction_type: 'used',
          amount,
          balance_after: newBalance,
          notes: 'Cashback utilizado no pedido',
          tenant_id: effectiveTenantId,
        });

      if (txError) {
        console.error('[process-cashback] Error recording transaction:', txError);
      }

      console.log(`[process-cashback] Used R$${amount.toFixed(2)} from ${customer_email}`);

      return new Response(
        JSON.stringify({ success: true, amount_used: amount, new_balance: newBalance }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );

    } else if (action === 'expire') {
      // Expire old cashback (called by cron job)
      const now = new Date().toISOString();
      
      // Find expired transactions
      const { data: expiredTx, error: fetchError } = await supabase
        .from('cashback_transactions')
        .select('*')
        .eq('transaction_type', 'earned')
        .eq('expired', false)
        .lt('expires_at', now);

      if (fetchError) {
        console.error('[process-cashback] Error fetching expired transactions:', fetchError);
        throw fetchError;
      }

      let totalExpired = 0;
      for (const tx of expiredTx || []) {
        // Mark as expired
        await supabase
          .from('cashback_transactions')
          .update({ expired: true })
          .eq('id', tx.id);

        // Update balance
        const { data: balance } = await supabase
          .from('cashback_balances')
          .select('*')
          .eq('customer_email', tx.customer_email)
          .single();

        if (balance) {
          const newBalance = Math.max(0, balance.current_balance - tx.amount);
          await supabase
            .from('cashback_balances')
            .update({
              current_balance: newBalance,
              total_expired: balance.total_expired + tx.amount,
            })
            .eq('customer_email', tx.customer_email);

          // Record expiration transaction
          await supabase
            .from('cashback_transactions')
            .insert({
              customer_email: tx.customer_email,
              order_id: tx.order_id,
              transaction_type: 'expired',
              amount: tx.amount,
              balance_after: newBalance,
              notes: 'Cashback expirado após 40 dias',
            });

          totalExpired += tx.amount;
        }
      }

      console.log(`[process-cashback] Expired ${expiredTx?.length || 0} transactions, total R$${totalExpired.toFixed(2)}`);

      return new Response(
        JSON.stringify({ success: true, expired_count: expiredTx?.length || 0, total_expired: totalExpired }),
        { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[process-cashback] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function getOrCreateBalance(supabase: any, customerEmail: string) {
  const { data: existing, error } = await supabase
    .from('cashback_balances')
    .select('*')
    .eq('customer_email', customerEmail)
    .single();

  if (existing) return existing;

  // Create new balance
  const { data: newBalance, error: insertError } = await supabase
    .from('cashback_balances')
    .insert({
      customer_email: customerEmail,
      current_balance: 0,
      total_earned: 0,
      total_used: 0,
      total_expired: 0,
      total_orders: 0,
      total_spent: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[process-cashback] Error creating balance:', insertError);
    throw insertError;
  }

  return newBalance;
}

async function getCustomerLevel(supabase: any, totalOrders: number, totalSpent: number, tenantId?: string) {
  const query = supabase
    .from('loyalty_levels')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  
  if (tenantId) {
    query.eq('tenant_id', tenantId);
  }
  
  const { data: levels, error } = await query;

  if (error || !levels?.length) return null;

  // Find highest qualifying level
  let currentLevel = levels[0];
  for (const level of levels) {
    if (totalOrders >= level.min_orders || totalSpent >= level.min_spent) {
      currentLevel = level;
    }
  }

  return currentLevel;
}
