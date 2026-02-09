-- Add per-category ingredient pricing columns to tenant_diet_pricing
ALTER TABLE public.tenant_diet_pricing
  ADD COLUMN IF NOT EXISTS protein_cost_per_kg numeric DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS protein_cooking_loss numeric DEFAULT 30,
  ADD COLUMN IF NOT EXISTS carb_cost_per_kg numeric DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS carb_cooking_loss numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS veggie_cost_per_kg numeric DEFAULT 12.00,
  ADD COLUMN IF NOT EXISTS veggie_cooking_loss numeric DEFAULT 15;