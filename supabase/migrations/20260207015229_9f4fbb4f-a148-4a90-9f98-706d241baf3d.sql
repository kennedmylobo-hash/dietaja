
ALTER TABLE public.user_roles
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- Vincular admins existentes ao tenant correto via profiles
UPDATE public.user_roles ur
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.role = 'admin'
  AND ur.tenant_id IS NULL;

CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);

-- Update has_role function to support tenant-aware checks
CREATE OR REPLACE FUNCTION public.has_role_for_tenant(_user_id uuid, _role app_role, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND tenant_id = _tenant_id
  )
$$;

-- Function to get the tenant_id for an admin user
CREATE OR REPLACE FUNCTION public.get_admin_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'admin'
  LIMIT 1
$$;
