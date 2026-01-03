-- Add stock_decremented flag to orders to prevent double decrementation
ALTER TABLE public.orders ADD COLUMN stock_decremented BOOLEAN DEFAULT false;