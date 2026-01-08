-- Create notification_events table to track all notification events
CREATE TABLE public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Channel and event type
  channel TEXT NOT NULL, -- 'whatsapp' or 'email'
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'read', 'opened', 'clicked', 'failed', 'bounced', 'complained'
  
  -- Order reference
  order_id UUID REFERENCES public.orders(id),
  order_number TEXT,
  
  -- Recipient info
  recipient_phone TEXT,
  recipient_email TEXT,
  
  -- Message details
  template_name TEXT,
  message_id TEXT,
  
  -- Additional data
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for common queries
CREATE INDEX idx_notification_events_created_at ON public.notification_events(created_at DESC);
CREATE INDEX idx_notification_events_channel ON public.notification_events(channel);
CREATE INDEX idx_notification_events_event_type ON public.notification_events(event_type);
CREATE INDEX idx_notification_events_message_id ON public.notification_events(message_id);
CREATE INDEX idx_notification_events_order_id ON public.notification_events(order_id);

-- Enable RLS
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all events
CREATE POLICY "Admins can view notification events"
ON public.notification_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert events (for webhooks and edge functions)
CREATE POLICY "Service role can insert notification events"
ON public.notification_events
FOR INSERT
WITH CHECK (true);