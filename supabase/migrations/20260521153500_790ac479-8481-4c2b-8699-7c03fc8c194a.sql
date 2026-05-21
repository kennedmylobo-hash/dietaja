
-- Trigger-only helpers: revoke from everyone (executed via triggers as owner)
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;

-- Role/tenant helpers used inside RLS policies: must be executable by roles that hit those tables
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role_for_tenant(uuid, app_role, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role_for_tenant(uuid, app_role, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO anon, authenticated;

-- Admin-only helper: only authenticated users need it
REVOKE ALL ON FUNCTION public.get_admin_tenant_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_tenant_id(uuid) TO authenticated;

-- Public tenant resolution (anonymous landing pages need this)
REVOKE ALL ON FUNCTION public.get_tenant_by_filter(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_by_filter(text, text, uuid, text) TO anon, authenticated;

-- Coupon increment is called from cart checkout (anon allowed)
REVOKE ALL ON FUNCTION public.increment_coupon_usage(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO anon, authenticated;
