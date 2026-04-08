-- Fix: Allow anonymous users to insert checkout error logs
DROP POLICY IF EXISTS "Service role can insert payment error logs" ON public.payment_error_logs;

CREATE POLICY "Anyone can insert payment error logs"
ON public.payment_error_logs
FOR INSERT
TO public
WITH CHECK (tenant_id IS NOT NULL);