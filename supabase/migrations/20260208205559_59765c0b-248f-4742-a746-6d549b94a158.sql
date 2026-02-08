
-- Table for per-tenant diet pricing configuration
CREATE TABLE public.tenant_diet_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cost_per_gram NUMERIC(10,4) NOT NULL DEFAULT 0.04,
  packaging_cost NUMERIC(10,2) NOT NULL DEFAULT 1.50,
  fixed_cost_per_meal NUMERIC(10,2) NOT NULL DEFAULT 2.00,
  pricing_mode TEXT NOT NULL DEFAULT 'margin' CHECK (pricing_mode IN ('margin', 'manual')),
  margin_percent NUMERIC(10,2) NOT NULL DEFAULT 100,
  manual_price_per_gram NUMERIC(10,4) NOT NULL DEFAULT 0.08,
  package_options JSONB NOT NULL DEFAULT '[{"days":7,"label":"7 dias","discount":0},{"days":14,"label":"14 dias","discount":0.05},{"days":21,"label":"21 dias","discount":0.08},{"days":28,"label":"28 dias","discount":0.10}]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- RLS
ALTER TABLE public.tenant_diet_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.tenant_diet_pricing
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Updated at trigger
CREATE TRIGGER update_tenant_diet_pricing_updated_at
  BEFORE UPDATE ON public.tenant_diet_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
