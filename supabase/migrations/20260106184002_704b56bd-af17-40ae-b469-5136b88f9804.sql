-- Create table for reminder settings
CREATE TABLE public.reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type TEXT NOT NULL UNIQUE,
  delay_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage reminder settings"
ON public.reminder_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view reminder settings"
ON public.reminder_settings
FOR SELECT
USING (true);

-- Insert default values
INSERT INTO public.reminder_settings (reminder_type, delay_minutes, is_active) VALUES
  ('first_reminder', 15, true),
  ('second_reminder', 360, true);

-- Add trigger for updated_at
CREATE TRIGGER update_reminder_settings_updated_at
BEFORE UPDATE ON public.reminder_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();