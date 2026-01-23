-- Create table for payment error logs
CREATE TABLE public.payment_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  error_code TEXT,
  error_message TEXT,
  provider TEXT DEFAULT 'mercadopago',
  request_payload JSONB,
  response_payload JSONB,
  customer_phone TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all error logs
CREATE POLICY "Admins can view payment error logs"
ON public.payment_error_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert error logs (from edge functions)
CREATE POLICY "Service role can insert payment error logs"
ON public.payment_error_logs
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_payment_error_logs_created_at ON public.payment_error_logs(created_at DESC);
CREATE INDEX idx_payment_error_logs_order_id ON public.payment_error_logs(order_id);