-- Add per-flavor unit price overrides for Fit and Fitness lines
-- When NULL, the package's unit price is used as default
ALTER TABLE public.marmita_flavors 
  ADD COLUMN price_override_fit numeric DEFAULT NULL,
  ADD COLUMN price_override_fitness numeric DEFAULT NULL;