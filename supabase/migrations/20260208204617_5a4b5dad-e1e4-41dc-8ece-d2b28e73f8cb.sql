
CREATE TABLE public.custom_diet_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  price_per_gram NUMERIC(10,4) DEFAULT 0.08,
  subtotal_per_unit NUMERIC(10,2),
  package_options JSONB DEFAULT '[]',
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_diet_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.custom_diet_quotes
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

CREATE TRIGGER update_custom_diet_quotes_updated_at
  BEFORE UPDATE ON public.custom_diet_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
