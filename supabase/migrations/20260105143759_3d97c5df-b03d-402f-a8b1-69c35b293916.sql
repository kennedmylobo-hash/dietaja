-- Add column to track when reminder email was sent
ALTER TABLE public.orders
ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;