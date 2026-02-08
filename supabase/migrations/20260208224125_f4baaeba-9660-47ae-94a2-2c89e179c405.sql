
ALTER TABLE public.tenant_diet_pricing
  ADD COLUMN raw_cost_per_kg NUMERIC NOT NULL DEFAULT 20.00,
  ADD COLUMN cooking_loss_percent NUMERIC NOT NULL DEFAULT 30,
  ADD COLUMN correction_factor NUMERIC NOT NULL DEFAULT 1.43;
