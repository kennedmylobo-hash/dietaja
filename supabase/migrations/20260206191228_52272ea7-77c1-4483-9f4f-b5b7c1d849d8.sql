
-- Table: club_plans (managed by admin, read by public)
CREATE TABLE public.club_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  kit_type TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  items_description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_emoji TEXT NOT NULL DEFAULT '📦',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.club_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active club plans"
  ON public.club_plans FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage club plans"
  ON public.club_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_club_plans_updated_at
  BEFORE UPDATE ON public.club_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table: club_subscriptions (managed by edge functions via service role)
CREATE TABLE public.club_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_subscription_id TEXT,
  asaas_customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_cpf TEXT NOT NULL,
  delivery_option TEXT NOT NULL DEFAULT 'delivery',
  delivery_address TEXT,
  kit_type TEXT NOT NULL,
  kit_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  next_due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage subscriptions"
  ON public.club_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view subscriptions"
  ON public.club_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_club_subscriptions_updated_at
  BEFORE UPDATE ON public.club_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: 5 club plans with placeholder prices
INSERT INTO public.club_plans (name, kit_type, description, items_description, price, active, popular, sort_order, icon_emoji) VALUES
  ('Kit Suco Detox', 'suco_detox', 'Receba 20 sucos detox sortidos todo mês na sua porta', '20 sucos detox sortidos por mês', 199.90, true, false, 1, '🥤'),
  ('Kit Marmitas', 'marmitas', 'Receba 20 marmitas fit sortidas todo mês', '20 marmitas sortidas por mês', 249.90, true, true, 2, '🥗'),
  ('Kit Sopas', 'sopas', 'Receba 20 sopas nutritivas sortidas todo mês', '20 sopas sortidas por mês', 219.90, true, false, 3, '🍲'),
  ('Kit Almoço + Janta', 'almoco_janta', 'Almoço e janta resolvidos: 20 marmitas + 20 sopas sortidos', '20 marmitas + 20 sopas por mês', 399.90, true, true, 4, '🍽️'),
  ('Kit Almoço + Suco', 'almoco_suco', 'Refeição completa: 20 marmitas + 20 sucos detox sortidos', '20 marmitas + 20 sucos por mês', 379.90, true, false, 5, '🥤🥗');
