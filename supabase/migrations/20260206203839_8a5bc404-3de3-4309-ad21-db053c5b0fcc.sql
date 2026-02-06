
-- Migração 2: Tabelas novas + tenant_id em todas as existentes

-- 1. Criar tabela platform_plans
CREATE TABLE public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_products integer,
  max_orders_month integer,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage plans" ON public.platform_plans FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Anyone can view active plans" ON public.platform_plans FOR SELECT USING (active = true);

-- 2. Criar tabela tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  brand_name text NOT NULL,
  brand_slogan text NOT NULL DEFAULT '',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#22c55e',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  whatsapp_formatted text NOT NULL DEFAULT '',
  delivery_fee numeric NOT NULL DEFAULT 0,
  pickup_neighborhood text NOT NULL DEFAULT '',
  facebook_pixel_id text,
  google_analytics_id text,
  og_image_url text,
  plan_type text NOT NULL DEFAULT 'free',
  plan_price numeric NOT NULL DEFAULT 0,
  plan_status text NOT NULL DEFAULT 'active',
  plan_due_date date,
  is_active boolean NOT NULL DEFAULT true,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage all tenants" ON public.tenants FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Anyone can view active tenants" ON public.tenants FOR SELECT USING (is_active = true);

-- 3. Inserir tenant Dieta Já
INSERT INTO public.tenants (id, slug, brand_name, brand_slogan, primary_color, city, state, whatsapp, whatsapp_formatted, delivery_fee, pickup_neighborhood, plan_type, plan_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'dietaja', 'Dieta Já', 'Alimentação Saudável Pronta', '#22c55e', 'Vitória da Conquista', 'BA', '5577991001658', '(77) 99100-1658', 10, 'Recreio', 'premium', 'active');

-- 4. Inserir planos padrão
INSERT INTO public.platform_plans (name, slug, price, features, sort_order) VALUES
  ('Básico', 'basico', 99, '["Cardápio digital","Pedidos online","Painel admin"]', 1),
  ('Pro', 'pro', 199, '["Tudo do Básico","Marketing automático","Cashback","Cupons"]', 2),
  ('Premium', 'premium', 299, '["Tudo do Pro","Clube de assinatura","Relatórios avançados","Suporte prioritário"]', 3);

-- 5. Adicionar tenant_id em TODAS as tabelas existentes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.marmita_flavors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.marmita_packages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.marmita_sides ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kit_juices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kit_soups ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.kit_packages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.menu_categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.coupon_usage ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.marketing_messages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.recurring_customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.payment_error_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.reminder_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.recompra_campaigns ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.pending_notifications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.order_status_history ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.cashback_balances ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.cashback_transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.loyalty_levels ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.club_plans ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.club_subscriptions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- 6. Função helper para obter tenant_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 7. Triggers para updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_plans_updated_at BEFORE UPDATE ON public.platform_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
