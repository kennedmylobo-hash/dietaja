ALTER TABLE public.marmita_flavors
  ADD COLUMN IF NOT EXISTS price_tiers_fit jsonb,
  ADD COLUMN IF NOT EXISTS price_tiers_fitness jsonb;