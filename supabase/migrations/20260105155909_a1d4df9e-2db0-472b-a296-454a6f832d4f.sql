-- Add WhatsApp tracking columns for NotificaMe Hub integration
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS whatsapp_2_sent_at TIMESTAMPTZ DEFAULT NULL;