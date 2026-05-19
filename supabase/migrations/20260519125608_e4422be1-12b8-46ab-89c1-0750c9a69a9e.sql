ALTER TABLE public.custom_diet_quotes
  ADD COLUMN IF NOT EXISTS raw_diet_input text,
  ADD COLUMN IF NOT EXISTS formatted_message text;