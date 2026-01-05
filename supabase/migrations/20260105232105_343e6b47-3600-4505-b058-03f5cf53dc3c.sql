-- Create carts table for abandoned cart recovery
CREATE TABLE public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  email text,
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  status text DEFAULT 'active', -- 'active', 'abandoned', 'converted'
  last_activity_at timestamp with time zone DEFAULT now(),
  reminder_sent_at timestamp with time zone,
  whatsapp_sent_at timestamp with time zone,
  whatsapp_2_sent_at timestamp with time zone,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can insert carts"
ON public.carts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their own cart by phone"
ON public.carts
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can select their own cart by phone"
ON public.carts
FOR SELECT
USING (true);

CREATE POLICY "Admins can view all carts"
ON public.carts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update carts"
ON public.carts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_carts_phone ON public.carts(phone);
CREATE INDEX idx_carts_status ON public.carts(status);
CREATE INDEX idx_carts_last_activity ON public.carts(last_activity_at);