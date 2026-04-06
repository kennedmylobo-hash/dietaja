
-- 1. Tighten public INSERT policies with basic field validation
-- Orders: require essential fields
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders
  FOR INSERT TO public
  WITH CHECK (
    customer_name IS NOT NULL AND customer_name <> ''
    AND customer_email IS NOT NULL AND customer_email <> ''
    AND customer_phone IS NOT NULL AND customer_phone <> ''
    AND items IS NOT NULL
    AND total > 0
    AND tenant_id IS NOT NULL
  );

-- Carts: require phone and tenant_id
DROP POLICY IF EXISTS "Anyone can insert carts" ON public.carts;
CREATE POLICY "Anyone can insert carts" ON public.carts
  FOR INSERT TO public
  WITH CHECK (
    phone IS NOT NULL AND phone <> ''
    AND tenant_id IS NOT NULL
  );

-- Analytics: require session_id and event_type
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics" ON public.analytics_events
  FOR INSERT TO public
  WITH CHECK (
    session_id IS NOT NULL AND session_id <> ''
    AND event_type IS NOT NULL AND event_type <> ''
  );

-- Leads: require name and phone
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT TO public
  WITH CHECK (
    name IS NOT NULL AND name <> ''
    AND phone IS NOT NULL AND phone <> ''
    AND tenant_id IS NOT NULL
  );

-- Reviews: require rating and email
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Anyone can insert reviews" ON public.reviews
  FOR INSERT TO public
  WITH CHECK (
    customer_email IS NOT NULL AND customer_email <> ''
    AND rating IS NOT NULL AND rating >= 1 AND rating <= 5
    AND tenant_id IS NOT NULL
  );

-- Client feedbacks: require token_id and rating
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON public.client_feedbacks;
CREATE POLICY "Anyone can insert feedbacks" ON public.client_feedbacks
  FOR INSERT TO public
  WITH CHECK (
    token_id IS NOT NULL
    AND rating IS NOT NULL AND rating >= 1 AND rating <= 5
    AND tenant_id IS NOT NULL
  );

-- 2. Restrict "service role" INSERT policies to authenticated only
-- These should only be insertable from edge functions (which use service role key)
-- but the WITH CHECK (true) on public role is too permissive

-- cashback_transactions: restrict to authenticated
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.cashback_transactions;
CREATE POLICY "Service role can insert transactions" ON public.cashback_transactions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND customer_email IS NOT NULL);

-- coupon_usage
DROP POLICY IF EXISTS "Service role can insert coupon usage" ON public.coupon_usage;
CREATE POLICY "Service role can insert coupon usage" ON public.coupon_usage
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND coupon_code IS NOT NULL);

-- notification_events
DROP POLICY IF EXISTS "Service role can insert notification events" ON public.notification_events;
CREATE POLICY "Service role can insert notification events" ON public.notification_events
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL);

-- payment_error_logs
DROP POLICY IF EXISTS "Service role can insert payment error logs" ON public.payment_error_logs;
CREATE POLICY "Service role can insert payment error logs" ON public.payment_error_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL);

-- profiles
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NOT NULL AND email IS NOT NULL);

-- recompra_campaigns
DROP POLICY IF EXISTS "Service role can insert recompra campaigns" ON public.recompra_campaigns;
CREATE POLICY "Service role can insert recompra campaigns" ON public.recompra_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL);

-- stock_movements
DROP POLICY IF EXISTS "Service role can insert stock movements" ON public.stock_movements;
CREATE POLICY "Service role can insert stock movements" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL);
