-- 1. Remove overly permissive public SELECT on coupons (validation happens via validate-coupon edge function)
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- 2. Restrict feedback tokens: only allow lookup by specific token value, not bulk enumeration
DROP POLICY IF EXISTS "Anyone can view token by value" ON public.client_feedback_tokens;

CREATE POLICY "Anyone can view token by specific value"
ON public.client_feedback_tokens
FOR SELECT
TO public
USING (
  is_active = true
  AND token = current_setting('request.headers', true)::json->>'x-feedback-token'
);