-- Add cancellation_type column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancellation_type text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.cancellation_type IS 'Type of cancellation: auto_orphan | auto_expired | manual | null';