-- Marketing/Remarketing improvements: referrals, loyalty points, club benefits

-- 1. Referral system
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  referrer_email text NOT NULL,
  referrer_name text,
  code text NOT NULL,
  discount_percent numeric DEFAULT 10,
  discount_months integer DEFAULT 1,
  usage_limit integer DEFAULT 10,
  used_count integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_tenant ON public.referrals(tenant_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage referrals"
  ON public.referrals FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Anyone can look up a referral code"
  ON public.referrals FOR SELECT USING (true);

-- Track referral redemptions
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  redeemed_by_email text NOT NULL,
  redeemed_by_name text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_red_referral ON public.referral_redemptions(referral_id);

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins view redemptions"
  ON public.referral_redemptions FOR SELECT TO authenticated
  USING (referral_id IN (SELECT id FROM public.referrals WHERE tenant_id = get_current_tenant_id()));

CREATE POLICY "Anyone can insert redemption"
  ON public.referral_redemptions FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Loyalty points system
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  customer_name text,
  points_earned integer DEFAULT 0,
  points_redeemed integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_customer ON public.loyalty_points(tenant_id, customer_email);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage loyalty points"
  ON public.loyalty_points FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Customers view own points"
  ON public.loyalty_points FOR SELECT TO authenticated
  USING (customer_email = auth.jwt() ->> 'email');

-- Points history
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  type text NOT NULL CHECK (type IN ('earn', 'redeem', 'expire', 'bonus')),
  points integer NOT NULL,
  description text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON public.loyalty_transactions(tenant_id, customer_email);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage transactions"
  ON public.loyalty_transactions FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Customers view own transactions"
  ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (customer_email = auth.jwt() ->> 'email');

-- 3. Club benefits / milestones
CREATE TABLE IF NOT EXISTS public.club_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.club_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  min_months integer NOT NULL DEFAULT 0,
  benefit_type text NOT NULL DEFAULT 'discount' CHECK (benefit_type IN ('discount', 'free_item', 'free_shipping', 'upgrade')),
  benefit_value numeric DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.club_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage benefits"
  ON public.club_benefits FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Anyone can view active benefits"
  ON public.club_benefits FOR SELECT USING (true);

-- 4. Add referral_code and points columns to orders for tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_redeemed integer DEFAULT 0;

-- 5. Add milestone columns to club_plans
ALTER TABLE public.club_plans ADD COLUMN IF NOT EXISTS min_commitment_months integer DEFAULT 0;
ALTER TABLE public.club_plans ADD COLUMN IF NOT EXISTS max_discount_percent numeric DEFAULT 0;
