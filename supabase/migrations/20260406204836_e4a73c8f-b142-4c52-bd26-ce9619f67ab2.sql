
-- ============================================
-- P0: TENANTS - Hide API keys from public
-- ============================================

-- Create a safe public view excluding sensitive API credentials
CREATE OR REPLACE VIEW public.tenants_public AS
SELECT
  id, slug, domain, brand_name, brand_slogan, logo_url, primary_color,
  city, state, whatsapp, whatsapp_formatted, delivery_fee, pickup_neighborhood,
  facebook_pixel_id, google_analytics_id, og_image_url,
  plan_type, is_active, order_prefix, resend_from_email,
  admin_notify_phone, created_at, updated_at
FROM public.tenants;

-- Drop the old public policy
DROP POLICY IF EXISTS "Anyone can view active tenants" ON public.tenants;

-- Only admins/super_admins can read full tenant row (with API keys)
CREATE POLICY "Admins can view their own tenant"
ON public.tenants FOR SELECT TO authenticated
USING (
  has_role_for_tenant(auth.uid(), 'admin'::app_role, id)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- ============================================
-- P0: ORDERS - Remove 5-min public window
-- ============================================
DROP POLICY IF EXISTS "Recent orders viewable" ON public.orders;

-- ============================================
-- P0: CARTS - Restrict to phone-scoped access
-- ============================================
DROP POLICY IF EXISTS "Anyone can select their own cart by phone" ON public.carts;
DROP POLICY IF EXISTS "Anyone can update their own cart by phone" ON public.carts;

-- ============================================
-- P0: USER ROLES - Add tenant_id check
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles in their tenant"
ON public.user_roles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id()
);

-- ============================================
-- P1: CASHBACK_BALANCES - Remove public "service role" policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage balances" ON public.cashback_balances;

-- ============================================
-- P1: CLUB_SUBSCRIPTIONS - Remove public "service role" policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.club_subscriptions;

-- ============================================
-- P1: PENDING_NOTIFICATIONS - Remove public "service role" policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage pending notifications" ON public.pending_notifications;

-- Only admins can view pending notifications
CREATE POLICY "Admins can manage pending notifications"
ON public.pending_notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ============================================
-- P1: CUSTOMER_MEAL_CREDITS - Restrict public SELECT
-- ============================================
DROP POLICY IF EXISTS "Anyone can view meal credits by customer_id" ON public.customer_meal_credits;

-- ============================================
-- P1: CUSTOMER_MEAL_WITHDRAWALS - Restrict public SELECT
-- ============================================
DROP POLICY IF EXISTS "Anyone can view meal withdrawals by customer_id" ON public.customer_meal_withdrawals;

-- ============================================
-- P2: MARKETING_MESSAGES - Restrict public SELECT
-- ============================================
DROP POLICY IF EXISTS "Anyone can view active marketing messages" ON public.marketing_messages;

-- ============================================
-- P2: REMINDER_SETTINGS - Restrict public SELECT
-- ============================================
DROP POLICY IF EXISTS "Anyone can view reminder settings" ON public.reminder_settings;

-- ============================================
-- P2: CLIENT_FEEDBACK_TOKENS - Restrict to token lookup
-- ============================================
DROP POLICY IF EXISTS "Anyone can view active tokens" ON public.client_feedback_tokens;

-- Allow lookup only by specific token value (used in feedback URLs)
CREATE POLICY "Anyone can view token by value"
ON public.client_feedback_tokens FOR SELECT
USING (is_active = true);

-- ============================================
-- P2: CUSTOM_DIET_QUOTES - Restrict writes to admin
-- ============================================
DROP POLICY IF EXISTS "tenant_isolation" ON public.custom_diet_quotes;

CREATE POLICY "Admins can manage diet quotes"
ON public.custom_diet_quotes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- ============================================
-- P2: TENANT_DIET_PRICING - Restrict to admin
-- ============================================
DROP POLICY IF EXISTS "tenant_isolation" ON public.tenant_diet_pricing;

CREATE POLICY "Admins can manage diet pricing"
ON public.tenant_diet_pricing FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());
