
GRANT EXECUTE ON FUNCTION public.get_tenant_by_filter(text, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_tenant_id(uuid) TO authenticated;
