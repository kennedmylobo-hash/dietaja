
-- Drop the view approach - doesn't work with security invoker + restricted table
DROP VIEW IF EXISTS public.tenants_public;

-- Drop the admin-only policy we just created
DROP POLICY IF EXISTS "Admins can view their own tenant" ON public.tenants;

-- Re-create a public SELECT policy but ONLY for non-sensitive columns
-- Since RLS can't filter columns, we use a security definer function instead
CREATE OR REPLACE FUNCTION public.get_tenant_by_filter(
  _slug text DEFAULT NULL,
  _domain text DEFAULT NULL,
  _id uuid DEFAULT NULL,
  _or_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  domain text,
  brand_name text,
  brand_slogan text,
  logo_url text,
  primary_color text,
  city text,
  state text,
  whatsapp text,
  whatsapp_formatted text,
  delivery_fee numeric,
  pickup_neighborhood text,
  facebook_pixel_id text,
  google_analytics_id text,
  og_image_url text,
  plan_type text,
  plan_status text,
  plan_due_date date,
  is_active boolean,
  order_prefix text,
  resend_from_email text,
  admin_notify_phone text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id, t.slug, t.domain, t.brand_name, t.brand_slogan, t.logo_url, t.primary_color,
    t.city, t.state, t.whatsapp, t.whatsapp_formatted, t.delivery_fee, t.pickup_neighborhood,
    t.facebook_pixel_id, t.google_analytics_id, t.og_image_url,
    t.plan_type, t.plan_status, t.plan_due_date, t.is_active, t.order_prefix,
    t.resend_from_email, t.admin_notify_phone, t.created_at, t.updated_at
  FROM public.tenants t
  WHERE t.is_active = true
    AND (
      (_slug IS NOT NULL AND t.slug = _slug)
      OR (_domain IS NOT NULL AND (t.domain = _domain OR t.domain ILIKE '%' || _domain))
      OR (_id IS NOT NULL AND t.id = _id)
    )
  LIMIT 1;
$$;

-- Restore public read access to tenants table but now admins only can see full data
-- Public users must use the get_tenant_by_filter function
CREATE POLICY "Admins can view full tenant data"
ON public.tenants FOR SELECT TO authenticated
USING (
  has_role_for_tenant(auth.uid(), 'admin'::app_role, id)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
