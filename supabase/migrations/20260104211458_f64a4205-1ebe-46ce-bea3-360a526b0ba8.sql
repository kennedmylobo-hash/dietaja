-- Add new columns for enhanced analytics tracking
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS section_time_spent INTEGER,
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes for better query performance on funnel analysis
CREATE INDEX IF NOT EXISTS idx_analytics_session_created ON analytics_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_section ON analytics_events(section);