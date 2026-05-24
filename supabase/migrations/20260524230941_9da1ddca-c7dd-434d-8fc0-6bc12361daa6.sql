GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_for_tenant(uuid, public.app_role, uuid) TO authenticated;