-- Migração: Melhorias de entrega, agendamento, macros e restrições

-- 1. Agendamento de entrega + horário de corte semanal
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cutoff_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cutoff_time time NOT NULL DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS production_day integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS delivery_days integer[] NOT NULL DEFAULT '{1}',
  ADD COLUMN IF NOT EXISTS cutoff_message text DEFAULT 'Pedidos até domingo às 18h são produzidos na terça e entregues na segunda seguinte.';

-- 2. Data agendada no pedido
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS delivery_time_window text;

-- 3. Tabela de zonas de entrega (taxa dinâmica por bairro/região)
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  neighborhoods text[] NOT NULL DEFAULT '{}',
  fee numeric NOT NULL DEFAULT 0,
  estimated_time text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage delivery zones"
  ON public.delivery_zones FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Anyone can view active delivery zones"
  ON public.delivery_zones FOR SELECT USING (true);

-- 4. Macros nutricionais e restrições nos sabores
ALTER TABLE public.marmita_flavors
  ADD COLUMN IF NOT EXISTS calories integer,
  ADD COLUMN IF NOT EXISTS protein_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS carbs_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS fats_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS fiber_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS allergens text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS restrictions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;

-- 5. Tabela de plano alimentar do cliente
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Meu Plano',
  week_start date NOT NULL,
  days jsonb NOT NULL DEFAULT '[]',
  goal text DEFAULT '',
  restrictions text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their own meal plans"
  ON public.meal_plans FOR ALL TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Tenant admins can view customer meal plans"
  ON public.meal_plans FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- 6. Atualizar a função get_tenant_by_filter para incluir novos campos
CREATE OR REPLACE FUNCTION public.get_tenant_by_filter(p_slug text DEFAULT NULL, p_domain text DEFAULT NULL)
RETURNS TABLE(
  id uuid, slug text, domain text, brand_name text, brand_slogan text,
  logo_url text, primary_color text, city text, state text,
  whatsapp text, whatsapp_formatted text, delivery_fee numeric,
  pickup_neighborhood text, facebook_pixel_id text, google_analytics_id text,
  og_image_url text, cutoff_day integer, cutoff_time time,
  production_day integer, delivery_days integer[], cutoff_message text
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id, t.slug, t.domain, t.brand_name, t.brand_slogan,
    t.logo_url, t.primary_color, t.city, t.state,
    t.whatsapp, t.whatsapp_formatted, t.delivery_fee,
    t.pickup_neighborhood, t.facebook_pixel_id, t.google_analytics_id,
    t.og_image_url, t.cutoff_day, t.cutoff_time,
    t.production_day, t.delivery_days, t.cutoff_message
  FROM public.tenants t
  WHERE t.is_active = true
    AND (p_slug IS NULL OR t.slug = p_slug)
    AND (p_domain IS NULL OR t.domain = p_domain)
  LIMIT 1;
END;
$$;
