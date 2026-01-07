-- Add columns for marmita lines
ALTER TABLE marmita_packages ADD COLUMN IF NOT EXISTS line_type TEXT DEFAULT 'emagrecimento';
ALTER TABLE marmita_packages ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 300;
ALTER TABLE marmita_packages ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing packages as Emagrecimento 300g
UPDATE marmita_packages SET 
  line_type = 'emagrecimento',
  weight = 300,
  description = 'Refeições balanceadas de 300g para emagrecimento e definição'
WHERE line_type IS NULL OR line_type = 'emagrecimento';

-- Insert Hipertrofia 450g packages
INSERT INTO marmita_packages (name, quantity, unit_price, line_type, weight, description, active, popular, sort_order)
VALUES 
  ('Combo Hipertrofia 7 Marmitas', 7, 31.90, 'hipertrofia', 450, '150g proteína + 200g carbo + 100g mix vegetal', true, false, 10),
  ('Combo Hipertrofia 14 Marmitas', 14, 28.90, 'hipertrofia', 450, '150g proteína + 200g carbo + 100g mix vegetal', true, true, 11),
  ('Combo Hipertrofia 28 Marmitas', 28, 24.90, 'hipertrofia', 450, '150g proteína + 200g carbo + 100g mix vegetal', true, false, 12);