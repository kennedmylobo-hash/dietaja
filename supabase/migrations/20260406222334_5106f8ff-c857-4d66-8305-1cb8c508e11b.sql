-- Remove header-based policy that may not work
DROP POLICY IF EXISTS "Anyone can view token by specific value" ON public.client_feedback_tokens;
-- No public SELECT needed - token lookup is done via get_feedback_token RPC
-- Admin access still works via "Admins can manage feedback tokens" policy