
-- Create ab_tests table
CREATE TABLE public.ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  name TEXT NOT NULL,
  target_section TEXT NOT NULL,
  variant_a_value TEXT NOT NULL,
  variant_b_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paused',
  traffic_split INTEGER NOT NULL DEFAULT 50,
  winner TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

-- Admins can manage their tenant's tests
CREATE POLICY "Admins can manage ab tests"
ON public.ab_tests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- Public can read active tests (needed for the hook on the frontend)
CREATE POLICY "Anyone can view active ab tests"
ON public.ab_tests
FOR SELECT
USING (status = 'active');
