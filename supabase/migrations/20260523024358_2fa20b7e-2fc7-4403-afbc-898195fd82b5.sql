
-- 1. Remove listing capability on public buckets (URLs still work)
DROP POLICY IF EXISTS "Anyone can view tenant assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feedback photos" ON storage.objects;

-- 2. Lock down SECURITY DEFINER functions not meant to be called directly by clients
REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_tenant_id(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role_for_tenant(uuid, public.app_role, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_tenant_by_filter(text, text, uuid, text) FROM anon, authenticated;

-- Keep these callable (used by client code / RLS evaluation works regardless):
-- public.has_role(uuid, app_role) — called via RPC from Admin/SuperAdmin
-- public.increment_coupon_usage(text) — called via RPC from CartDrawer
