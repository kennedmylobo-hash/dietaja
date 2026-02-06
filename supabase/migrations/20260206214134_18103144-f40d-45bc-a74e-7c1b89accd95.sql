
-- ============================================================
-- FASE 3: Multi-tenant RLS Isolation
-- Update all admin policies to filter by tenant_id
-- ============================================================

-- ==================== ORDERS ====================
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "View orders policy" ON public.orders;

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- Keep anonymous recent orders for checkout flow
CREATE POLICY "Recent orders viewable"
  ON public.orders FOR SELECT
  USING (created_at > (now() - '00:05:00'::interval));

-- ==================== MARMITA_PACKAGES ====================
DROP POLICY IF EXISTS "Admins can manage marmita packages" ON public.marmita_packages;
CREATE POLICY "Admins can manage marmita packages"
  ON public.marmita_packages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== MARMITA_FLAVORS ====================
DROP POLICY IF EXISTS "Admins can manage marmita flavors" ON public.marmita_flavors;
CREATE POLICY "Admins can manage marmita flavors"
  ON public.marmita_flavors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== MARMITA_SIDES ====================
DROP POLICY IF EXISTS "Admins can manage marmita sides" ON public.marmita_sides;
CREATE POLICY "Admins can manage marmita sides"
  ON public.marmita_sides FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== KIT_PACKAGES ====================
DROP POLICY IF EXISTS "Admins can manage kit packages" ON public.kit_packages;
CREATE POLICY "Admins can manage kit packages"
  ON public.kit_packages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== KIT_SOUPS ====================
DROP POLICY IF EXISTS "Admins can manage kit soups" ON public.kit_soups;
CREATE POLICY "Admins can manage kit soups"
  ON public.kit_soups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== KIT_JUICES ====================
DROP POLICY IF EXISTS "Admins can manage kit juices" ON public.kit_juices;
CREATE POLICY "Admins can manage kit juices"
  ON public.kit_juices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== MENU_CATEGORIES ====================
DROP POLICY IF EXISTS "Admins can manage categories" ON public.menu_categories;
CREATE POLICY "Admins can manage categories"
  ON public.menu_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== CARTS ====================
DROP POLICY IF EXISTS "Admins can view all carts" ON public.carts;
DROP POLICY IF EXISTS "Admins can update carts" ON public.carts;
CREATE POLICY "Admins can view all carts"
  ON public.carts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());
CREATE POLICY "Admins can update carts"
  ON public.carts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== LEADS ====================
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== ANALYTICS_EVENTS ====================
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.analytics_events;
CREATE POLICY "Admins can view all analytics"
  ON public.analytics_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== REVIEWS ====================
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== COUPONS ====================
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== COUPON_USAGE ====================
DROP POLICY IF EXISTS "Admins can view coupon usage" ON public.coupon_usage;
CREATE POLICY "Admins can view coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== CASHBACK_BALANCES ====================
DROP POLICY IF EXISTS "Admins can view all balances" ON public.cashback_balances;
CREATE POLICY "Admins can view all balances"
  ON public.cashback_balances FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== CASHBACK_TRANSACTIONS ====================
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.cashback_transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.cashback_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== CLUB_PLANS ====================
DROP POLICY IF EXISTS "Admins can manage club plans" ON public.club_plans;
CREATE POLICY "Admins can manage club plans"
  ON public.club_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== CLUB_SUBSCRIPTIONS ====================
DROP POLICY IF EXISTS "Admins can view subscriptions" ON public.club_subscriptions;
CREATE POLICY "Admins can view subscriptions"
  ON public.club_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== MARKETING_MESSAGES ====================
DROP POLICY IF EXISTS "Admins can manage marketing messages" ON public.marketing_messages;
CREATE POLICY "Admins can manage marketing messages"
  ON public.marketing_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== RECURRING_CUSTOMERS ====================
DROP POLICY IF EXISTS "Admins can manage recurring customers" ON public.recurring_customers;
CREATE POLICY "Admins can manage recurring customers"
  ON public.recurring_customers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== REMINDER_SETTINGS ====================
DROP POLICY IF EXISTS "Admins can manage reminder settings" ON public.reminder_settings;
CREATE POLICY "Admins can manage reminder settings"
  ON public.reminder_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== ORDER_STATUS_HISTORY ====================
DROP POLICY IF EXISTS "Admins can view order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins can insert order status history" ON public.order_status_history;
CREATE POLICY "Admins can view order status history"
  ON public.order_status_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());
CREATE POLICY "Admins can insert order status history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== STOCK_MOVEMENTS ====================
DROP POLICY IF EXISTS "Admins can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can insert stock movements" ON public.stock_movements;
CREATE POLICY "Admins can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());
CREATE POLICY "Admins can insert stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== NOTIFICATION_EVENTS ====================
DROP POLICY IF EXISTS "Admins can view notification events" ON public.notification_events;
CREATE POLICY "Admins can view notification events"
  ON public.notification_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== PAYMENT_ERROR_LOGS ====================
DROP POLICY IF EXISTS "Admins can view payment error logs" ON public.payment_error_logs;
CREATE POLICY "Admins can view payment error logs"
  ON public.payment_error_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== LOYALTY_LEVELS ====================
DROP POLICY IF EXISTS "Admins can manage loyalty levels" ON public.loyalty_levels;
CREATE POLICY "Admins can manage loyalty levels"
  ON public.loyalty_levels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== RECOMPRA_CAMPAIGNS ====================
DROP POLICY IF EXISTS "Admins can view recompra campaigns" ON public.recompra_campaigns;
CREATE POLICY "Admins can view recompra campaigns"
  ON public.recompra_campaigns FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());
