-- Create pending_notifications table for debounce system
CREATE TABLE public.pending_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 seconds'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id) -- Only one pending notification per order
);

-- Create index for efficient querying by scheduled_for
CREATE INDEX idx_pending_notifications_scheduled ON pending_notifications(scheduled_for);

-- Enable RLS
ALTER TABLE pending_notifications ENABLE ROW LEVEL SECURITY;

-- Service role only policy (edge functions use service role)
CREATE POLICY "Service role can manage pending notifications" 
ON pending_notifications FOR ALL 
USING (true)
WITH CHECK (true);