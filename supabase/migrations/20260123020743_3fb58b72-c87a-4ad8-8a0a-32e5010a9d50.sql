-- Add columns to store PIX payment data for the dedicated payment page
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
ADD COLUMN IF NOT EXISTS pix_qr_code_base64 TEXT,
ADD COLUMN IF NOT EXISTS pix_expiration TIMESTAMP WITH TIME ZONE;