CREATE TABLE IF NOT EXISTS public.diet_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  goal TEXT DEFAULT 'emagrecer',
  preferences TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert diet_requests"
  ON public.diet_requests FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Tenant admins can manage diet_requests"
  ON public.diet_requests FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE TRIGGER update_diet_requests_updated_at
  BEFORE UPDATE ON public.diet_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
