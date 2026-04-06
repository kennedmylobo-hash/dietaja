
-- Fix SECURITY DEFINER view issue
ALTER VIEW public.tenants_public SET (security_invoker = true);
