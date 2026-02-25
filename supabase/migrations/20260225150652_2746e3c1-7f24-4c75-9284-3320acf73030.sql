
-- Lotes de marmitas comprados pelo cliente
CREATE TABLE public.customer_meal_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.recurring_customers(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  remaining integer NOT NULL,
  expires_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id)
);

-- Retiradas de marmitas
CREATE TABLE public.customer_meal_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id uuid NOT NULL REFERENCES public.customer_meal_credits(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.recurring_customers(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  withdrawn_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id)
);

-- RLS
ALTER TABLE public.customer_meal_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_meal_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meal credits"
  ON public.customer_meal_credits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

CREATE POLICY "Admins can manage meal withdrawals"
  ON public.customer_meal_withdrawals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());
