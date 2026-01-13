-- Enable realtime for analytics_events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;

-- Add replica identity for complete row data in realtime updates
ALTER TABLE public.analytics_events REPLICA IDENTITY FULL;