
-- Add order_prefix column to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS order_prefix TEXT NOT NULL DEFAULT 'DJA';

-- Set the Dieta Já tenant prefix
UPDATE public.tenants SET order_prefix = 'DJA' WHERE id = '00000000-0000-0000-0000-000000000001';

-- Replace the generate_order_number function to use tenant prefix
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq_num INT;
BEGIN
  -- Get the order prefix from the tenant
  SELECT t.order_prefix INTO prefix
  FROM public.tenants t
  WHERE t.id = NEW.tenant_id;

  -- Fallback if no tenant found
  IF prefix IS NULL THEN
    prefix := 'DJA';
  END IF;

  -- Count existing orders for this tenant + 1
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.orders
  WHERE tenant_id = NEW.tenant_id;

  NEW.order_number := prefix || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
