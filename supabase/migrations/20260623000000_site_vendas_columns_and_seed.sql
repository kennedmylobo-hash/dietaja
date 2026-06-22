-- Site de Vendas /site: colunas faltantes + seed data completo

-- 1. Adicionar colunas faltantes em marmita_packages
ALTER TABLE public.marmita_packages
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'emagrecimento',
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2) DEFAULT 300,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 2. Adicionar colunas faltantes em marmita_flavors
ALTER TABLE public.marmita_flavors
  ADD COLUMN IF NOT EXISTS sides JSONB,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS show_stock BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS price_override_fit NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_override_fitness NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_tiers_fit JSONB,
  ADD COLUMN IF NOT EXISTS price_tiers_fitness JSONB,
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- 3. Atualizar CHECK constraint do category para aceitar novos valores
ALTER TABLE public.marmita_flavors
  DROP CONSTRAINT IF EXISTS marmita_flavors_category_check;

ALTER TABLE public.marmita_flavors
  ADD CONSTRAINT marmita_flavors_category_check
    CHECK (category IN ('carnes', 'frangos', 'massas', 'especiais', 'peixes', 'vegetariano', 'sopas'));

-- 4. Adicionar image_url em marmita_flavors para exibir fotos dos pratos
ALTER TABLE public.marmita_flavors
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 5. Adicionar policies RLS para público ler os dados do /site
DROP POLICY IF EXISTS "Anyone can view active flavors" ON public.marmita_flavors;
CREATE POLICY "Anyone can view active flavors"
  ON public.marmita_flavors FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Anyone can view active packages" ON public.marmita_packages;
CREATE POLICY "Anyone can view active packages"
  ON public.marmita_packages FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Anyone can view active kits" ON public.kit_packages;
CREATE POLICY "Anyone can view active kits"
  ON public.kit_packages FOR SELECT
  USING (active = true);

-- 6. Adicionar policies RLS para tenant_id nas tabelas (admins)
DROP POLICY IF EXISTS "Tenant admins can manage marmita_packages" ON public.marmita_packages;
CREATE POLICY "Tenant admins can manage marmita_packages"
  ON public.marmita_packages FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id IS NULL OR tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant admins can manage marmita_flavors" ON public.marmita_flavors;
CREATE POLICY "Tenant admins can manage marmita_flavors"
  ON public.marmita_flavors FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id IS NULL OR tenant_id = get_current_tenant_id());

-- ========================================
-- SEED DATA: Atualizar marmita_packages
-- ========================================
UPDATE public.marmita_packages SET
  line_type = 'emagrecimento',
  weight = 300,
  description = 'Perfeito para quem quer experimentar. 7 marmitas congeladas com sabores variados.'
WHERE name = 'Pacote 7 Marmitas';

UPDATE public.marmita_packages SET
  line_type = 'emagrecimento',
  weight = 300,
  description = 'Nosso mais popular. 14 marmitas com melhor custo-benefício.'
WHERE name = 'Pacote 14 Marmitas';

UPDATE public.marmita_packages SET
  line_type = 'emagrecimento',
  weight = 300,
  description = 'Para quem quer estoque completo. 28 marmitas com preço especial.'
WHERE name = 'Pacote 28 Marmitas';

-- Adicionar pacotes FITNESS
INSERT INTO public.marmita_packages (name, quantity, unit_price, active, popular, sort_order, line_type, weight, description)
VALUES
  ('Fit 7 Marmitas', 7, 29.90, true, false, 4, 'fitness', 400, 'Marmitas FIT maiores (400g). Ideal para quem treina.'),
  ('Fit 14 Marmitas', 14, 27.90, true, true, 5, 'fitness', 400, '14 marmitas FIT de 400g com alto teor de proteínas.'),
  ('Fit 28 Marmitas', 28, 24.90, true, false, 6, 'fitness', 400, '28 marmitas FIT de 400g. O melhor custo-benefício.')
ON CONFLICT DO NOTHING;

-- ========================================
-- SEED DATA: Atualizar marmita_flavors com sides, macros, preços
-- ========================================

-- Carnes: atualizar sides
UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Mix de Legumes", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Batata Doce", "weight": 100}]}',
  calories = 420, protein_g = 28, carbs_g = 45, fats_g = 12, fiber_g = 6,
  allergens = ARRAY['glúten'], restrictions = ARRAY['restricao_1', 'restricao_3'],
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Carne de Panela com Legumes';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão Preto", "weight": 80}, {"name": "Couve Refogada", "weight": 60}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Farofa", "weight": 30}]}',
  calories = 390, protein_g = 25, carbs_g = 40, fats_g = 14, fiber_g = 5,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Carne Moída ao Sugo';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Cebola Refogada", "weight": 40}, {"name": "Pimentão", "weight": 30}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Batata Sauté", "weight": 80}]}',
  calories = 400, protein_g = 26, carbs_g = 42, fats_g = 13, fiber_g = 4,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Carne Acebolada';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Batata Palha Fit", "weight": 40}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Batata Palha", "weight": 40}]}',
  calories = 450, protein_g = 30, carbs_g = 48, fats_g = 15, fiber_g = 3,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 26.90, price_override_fitness = 31.90
WHERE name = 'Estrogonofe de Carne';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão Verde", "weight": 80}, {"name": "Vinagrete", "weight": 50}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Mandioquinha", "weight": 80}]}',
  calories = 380, protein_g = 28, carbs_g = 38, fats_g = 10, fiber_g = 5,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Carne de Sol Desfiada';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Cenoura Cozida", "weight": 50}, {"name": "Brócolis", "weight": 50}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Purê de Batata", "weight": 100}]}',
  calories = 410, protein_g = 27, carbs_g = 44, fats_g = 11, fiber_g = 6,
  allergens = ARRAY['glúten'], restrictions = '{}',
  price_override_fit = 24.90, price_override_fitness = 28.90
WHERE name = 'Carne com Brócolis';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Legumes Salteados", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Aipim Cozido", "weight": 100}]}',
  calories = 360, protein_g = 24, carbs_g = 36, fats_g = 10, fiber_g = 4,
  allergens = '{}', restrictions = ARRAY['restricao_3'],
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Músculo Desfiado';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Mix de Legumes", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Batata Assada", "weight": 80}]}',
  calories = 435, protein_g = 29, carbs_g = 46, fats_g = 13, fiber_g = 5,
  allergens = ARRAY['glúten'], restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Cubos de Carne ao Molho Madeira';

-- Frangos: atualizar sides
UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Mix de Legumes", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Purê de Batata", "weight": 100}]}',
  calories = 350, protein_g = 32, carbs_g = 38, fats_g = 6, fiber_g = 4,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 22.90, price_override_fitness = 26.90
WHERE name = 'Frango Grelhado';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Cenoura", "weight": 50}, {"name": "Abobrinha", "weight": 50}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Farofa de Aveia", "weight": 30}]}',
  calories = 340, protein_g = 30, carbs_g = 36, fats_g = 7, fiber_g = 5,
  allergens = ARRAY['glúten'], restrictions = '{}',
  price_override_fit = 21.90, price_override_fitness = 25.90
WHERE name = 'Frango Desfiado';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Batata Palha Fit", "weight": 40}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Batata Palha", "weight": 40}]}',
  calories = 400, protein_g = 35, carbs_g = 42, fats_g = 10, fiber_g = 3,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 24.90, price_override_fitness = 28.90
WHERE name = 'Estrogonofe de Frango';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Legumes Salteados", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Legumes Salteados", "weight": 80}]}',
  calories = 370, protein_g = 28, carbs_g = 40, fats_g = 8, fiber_g = 4,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Frango Xadrez';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Purê de Batata Doce", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Purê de Batata", "weight": 100}]}',
  calories = 420, protein_g = 34, carbs_g = 44, fats_g = 12, fiber_g = 3,
  allergens = ARRAY['glúten', 'lácteos', 'ovos'], restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Frango à Parmegiana (assado)';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Mix de Legumes", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Legumes Salteados", "weight": 80}]}',
  calories = 330, protein_g = 26, carbs_g = 36, fats_g = 6, fiber_g = 6,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 22.90, price_override_fitness = 26.90
WHERE name = 'Frango com Legumes';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Mix de Legumes", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Batata Doce", "weight": 100}]}',
  calories = 360, protein_g = 28, carbs_g = 38, fats_g = 7, fiber_g = 4,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Cubos de Frango ao Molho';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Legumes Indianos", "weight": 80}], "fitness": [{"name": "Basmati", "weight": 100}, {"name": "Legumes Indianos", "weight": 80}]}',
  calories = 380, protein_g = 30, carbs_g = 42, fats_g = 9, fiber_g = 5,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Frango ao Curry';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Feijão", "weight": 80}, {"name": "Mix de Legumes", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Feijão", "weight": 100}, {"name": "Batata Sauté", "weight": 80}]}',
  calories = 380, protein_g = 30, carbs_g = 38, fats_g = 12, fiber_g = 3,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 24.90, price_override_fitness = 28.90
WHERE name = 'Sobrecoxa Grelhada';

-- Massas: atualizar sides
UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 380, protein_g = 22, carbs_g = 50, fats_g = 10, fiber_g = 4,
  allergens = ARRAY['glúten'], restrictions = '{}',
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Espaguete à Bolonhesa';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 360, protein_g = 18, carbs_g = 52, fats_g = 8, fiber_g = 3,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 22.90, price_override_fitness = 26.90
WHERE name = 'Macarrão ao Sugo';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 390, protein_g = 24, carbs_g = 48, fats_g = 10, fiber_g = 3,
  allergens = ARRAY['glúten'], restrictions = '{}',
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Espaguete Alho e Óleo com Frango';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada de Repolho", "weight": 80}], "fitness": [{"name": "Salada de Repolho", "weight": 80}]}',
  calories = 400, protein_g = 24, carbs_g = 48, fats_g = 12, fiber_g = 3,
  allergens = ARRAY['glúten'], restrictions = '{}',
  price_override_fit = 24.90, price_override_fitness = 28.90
WHERE name = 'Macarrão com Carne Moída';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 410, protein_g = 28, carbs_g = 44, fats_g = 14, fiber_g = 4,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Lasanha de Frango';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 430, protein_g = 26, carbs_g = 46, fats_g = 16, fiber_g = 4,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Lasanha à Bolonhesa';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 350, protein_g = 16, carbs_g = 50, fats_g = 10, fiber_g = 3,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 22.90, price_override_fitness = 26.90
WHERE name = 'Nhoque ao Sugo';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Salada Verde", "weight": 80}]}',
  calories = 380, protein_g = 24, carbs_g = 42, fats_g = 12, fiber_g = 4,
  allergens = ARRAY['glúten', 'ovos'], restrictions = '{}',
  price_override_fit = 24.90, price_override_fitness = 28.90
WHERE name = 'Panqueca de Carne';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Salada Verde", "weight": 80}]}',
  calories = 360, protein_g = 26, carbs_g = 40, fats_g = 10, fiber_g = 4,
  allergens = ARRAY['glúten', 'ovos'], restrictions = '{}',
  price_override_fit = 24.90, price_override_fitness = 28.90
WHERE name = 'Panqueca de Frango';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 420, protein_g = 26, carbs_g = 44, fats_g = 16, fiber_g = 4,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Escondidinho de Carne';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 400, protein_g = 28, carbs_g = 42, fats_g = 14, fiber_g = 4,
  allergens = ARRAY['glúten', 'lácteos'], restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Escondidinho de Frango';

-- Especiais: atualizar sides
UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Legumes Salteados", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Legumes Salteados", "weight": 80}]}',
  calories = 320, protein_g = 28, carbs_g = 30, fats_g = 8, fiber_g = 6,
  allergens = ARRAY['peixe'], restrictions = '{}',
  price_override_fit = 27.90, price_override_fitness = 32.90
WHERE name = 'Peixe Grelhado com Legumes';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 60}, {"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 80}, {"name": "Salada Verde", "weight": 80}]}',
  calories = 280, protein_g = 18, carbs_g = 20, fats_g = 14, fiber_g = 5,
  allergens = ARRAY['ovos'], restrictions = ARRAY['vegetariano'],
  price_override_fit = 22.90, price_override_fitness = 26.90
WHERE name = 'Omelete de Legumes';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 60}, {"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 80}, {"name": "Salada Verde", "weight": 80}]}',
  calories = 310, protein_g = 24, carbs_g = 22, fats_g = 14, fiber_g = 4,
  allergens = ARRAY['ovos'], restrictions = '{}',
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE name = 'Omelete de Frango';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Legumes Salteados", "weight": 100}], "fitness": [{"name": "Quinoa", "weight": 80}, {"name": "Legumes Salteados", "weight": 100}]}',
  calories = 240, protein_g = 10, carbs_g = 30, fats_g = 8, fiber_g = 8,
  allergens = '{}', restrictions = ARRAY['vegano', 'vegetariano', 'sem_gluten', 'sem_lacteos'],
  price_override_fit = 22.90, price_override_fitness = 26.90
WHERE name = 'Legumes Salteados (Vegano)';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Couve Refogada", "weight": 60}, {"name": "Laranja", "weight": 30}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Couve Refogada", "weight": 60}, {"name": "Torresmo", "weight": 20}]}',
  calories = 380, protein_g = 26, carbs_g = 42, fats_g = 12, fiber_g = 6,
  allergens = '{}', restrictions = '{}',
  price_override_fit = 26.90, price_override_fitness = 30.90
WHERE name = 'Feijoada Light';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Salada Verde", "weight": 80}]}',
  calories = 420, protein_g = 24, carbs_g = 48, fats_g = 14, fiber_g = 4,
  allergens = ARRAY['glúten'], restrictions = '{}',
  price_override_fit = 25.90, price_override_fitness = 29.90
WHERE name = 'Arroz de Carreteiro';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 60}, {"name": "Legumes Salteados", "weight": 100}], "fitness": [{"name": "Quinoa", "weight": 80}, {"name": "Legumes Salteados", "weight": 100}]}',
  calories = 260, protein_g = 12, carbs_g = 32, fats_g = 10, fiber_g = 7,
  allergens = '{}', restrictions = ARRAY['vegano', 'vegetariano', 'sem_gluten', 'sem_lacteos'],
  price_override_fit = 24.90, price_override_fitness = 28.90
WHERE name = 'Strogonoff de Cogumelos (Vegano)';

UPDATE public.marmita_flavors SET
  sides = '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Feijão", "weight": 60}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Feijão", "weight": 80}]}',
  calories = 340, protein_g = 26, carbs_g = 34, fats_g = 10, fiber_g = 5,
  allergens = ARRAY['peixe', 'lácteos'], restrictions = '{}',
  price_override_fit = 28.90, price_override_fitness = 33.90
WHERE name = 'Moqueca de Peixe';

-- ========================================
-- SEED DATA: Novos sabores (peixes, vegetariano, sopas)
-- ========================================

INSERT INTO public.marmita_flavors (name, category, sort_order, sides, calories, protein_g, carbs_g, fats_g, fiber_g, allergens, restrictions, price_override_fit, price_override_fitness)
VALUES
  -- Peixes
  ('Salmão Grelhado', 'peixes', 1,
   '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Aspargos", "weight": 60}, {"name": "Mix de Legumes", "weight": 60}], "fitness": [{"name": "Batata Doce", "weight": 100}, {"name": "Aspargos", "weight": 80}, {"name": "Mix de Legumes", "weight": 60}]}',
   380, 34, 28, 14, 5, ARRAY['peixe'], '{}', 32.90, 37.90),
  ('Tilápia com Legumes', 'peixes', 2,
   '{"fit": [{"name": "Arroz Integral", "weight": 100}, {"name": "Brócolis", "weight": 80}, {"name": "Cenoura", "weight": 50}], "fitness": [{"name": "Arroz Branco", "weight": 130}, {"name": "Brócolis", "weight": 80}, {"name": "Cenoura", "weight": 50}]}',
   320, 30, 32, 6, 6, ARRAY['peixe'], '{}', 28.90, 33.90),
  ('Bacalhau Desfiado', 'peixes', 3,
   '{"fit": [{"name": "Batata Doce", "weight": 100}, {"name": "Cebola Caramelizada", "weight": 40}, {"name": "Azeitonas", "weight": 20}], "fitness": [{"name": "Arroz Branco", "weight": 120}, {"name": "Batata Sauté", "weight": 80}, {"name": "Azeitonas", "weight": 20}]}',
   350, 32, 30, 10, 4, ARRAY['peixe'], ARRAY['sem_lacteos'], 34.90, 39.90),
  ('Meri Grelhada com Molho de Maracujá', 'peixes', 4,
   '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Mix de Legumes", "weight": 100}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Purê de Batata", "weight": 80}]}',
   310, 28, 30, 8, 5, ARRAY['peixe'], '{}', 29.90, 34.90),

  -- Vegetariano
  ('Grão de Bico Curry', 'vegetariano', 1,
   '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Legumes Indianos", "weight": 100}], "fitness": [{"name": "Quinoa", "weight": 80}, {"name": "Legumes Indianos", "weight": 100}]}',
   290, 14, 38, 8, 10, '{}', ARRAY['vegano', 'vegetariano', 'sem_gluten'], 22.90, 26.90),
  ('Lentilha com Legumes', 'vegetariano', 2,
   '{"fit": [{"name": "Arroz Integral", "weight": 80}, {"name": "Couve Refogada", "weight": 60}], "fitness": [{"name": "Arroz Branco", "weight": 100}, {"name": "Couve Refogada", "weight": 60}]}',
   310, 16, 40, 6, 12, '{}', ARRAY['vegano', 'vegetariano', 'sem_gluten', 'sem_lacteos'], 21.90, 25.90),
  ('Abóbora Assada com Quinoa', 'vegetariano', 3,
   '{"fit": [{"name": "Quinoa", "weight": 80}, {"name": "Salada de Rúcula", "weight": 60}], "fitness": [{"name": "Quinoa", "weight": 100}, {"name": "Salada de Rúcula", "weight": 60}]}',
   270, 12, 36, 8, 8, '{}', ARRAY['vegano', 'vegetariano', 'sem_gluten', 'sem_lacteos'], 23.90, 27.90),
  ('Berinjela à Parmegiana Vegana', 'vegetariano', 4,
   '{"fit": [{"name": "Arroz Integral", "weight": 60}, {"name": "Salada Verde", "weight": 80}], "fitness": [{"name": "Arroz Branco", "weight": 80}, {"name": "Salada Verde", "weight": 80}]}',
   280, 10, 34, 12, 8, '{}', ARRAY['vegano', 'vegetariano'], 24.90, 28.90),

  -- Sopas
  ('Sopa de Abóbora com Gengibre', 'sopas', 1,
   '{"fit": [{"name": "Torrada Integral", "weight": 20}], "fitness": [{"name": "Torrada Integral", "weight": 20}]}',
   180, 6, 28, 6, 5, '{}', ARRAY['vegano', 'vegetariano', 'sem_gluten'], 18.90, 22.90),
  ('Sopa de Legumes com Frango', 'sopas', 2,
   '{"fit": [{"name": "Torrada Integral", "weight": 20}], "fitness": [{"name": "Torrada Integral", "weight": 20}]}',
   220, 18, 24, 4, 6, '{}', ARRAY['sem_lacteos'], 20.90, 24.90),
  ('Caldo Verde Fitness', 'sopas', 3,
   '{"fit": [{"name": "Torrada Integral", "weight": 20}], "fitness": [{"name": "Torrada Integral", "weight": 20}]}',
   200, 14, 26, 5, 7, ARRAY['lácteos'], '{}', 19.90, 23.90),
  ('Sopa Detox de Couve', 'sopas', 4,
   '{"fit": [{"name": "Croutons Integrais", "weight": 15}], "fitness": [{"name": "Croutons Integrais", "weight": 15}]}',
   150, 6, 22, 4, 8, ARRAY['glúten'], ARRAY['vegano', 'vegetariano', 'sem_lacteos'], 19.90, 23.90)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- SEED DATA: Preços em massa para sabores sem price_override
-- (os que não têm preço individual usam o preço do pacote)
-- ========================================
UPDATE public.marmita_flavors SET
  price_override_fit = 23.90, price_override_fitness = 27.90
WHERE price_override_fit IS NULL AND price_override_fitness IS NULL;

-- ========================================
-- SEED DATA: Kits Detox - atualizar com descriptions e features
-- ========================================
UPDATE public.kit_packages SET
  features = '["12 sucos detox", "6 sopas funcionais", "Cardápio rotativo", "Guia de desintoxicação"]'::jsonb
WHERE name = 'Kit 3 Dias' AND features = '["12 sucos detox", "6 sopas funcionais", "Cardápio rotativo"]'::jsonb;

UPDATE public.kit_packages SET
  features = '["20 sucos detox", "10 sopas funcionais", "Acompanhamento nutricional", "Guia de desintoxicação", "Suporte por WhatsApp"]'::jsonb
WHERE name = 'Kit 5 Dias' AND features = '["20 sucos detox", "10 sopas funcionais", "Acompanhamento nutricional"]'::jsonb;

UPDATE public.kit_packages SET
  features = '["28 sucos detox", "14 sopas funcionais", "Suporte exclusivo WhatsApp", "Acompanhamento nutricional", "Guia de desintoxicação", "Grupo VIP de alunos"]'::jsonb
WHERE name = 'Kit 7 Dias' AND features = '["28 sucos detox", "14 sopas funcionais", "Suporte exclusivo WhatsApp"]'::jsonb;

-- ========================================
-- SEED DATA: Imagens dos sabores (3 fotos alternadas)
-- ========================================
-- Fotos fornecidas pelo cliente (dietajavca.com.br)
-- Alterna 3 imagens em round-robin por ordem de exibição

WITH numbered AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY sort_order, name) - 1) % 3 AS img_idx
  FROM public.marmita_flavors
  WHERE image_url IS NULL
)
UPDATE public.marmita_flavors f
SET image_url = CASE n.img_idx
  WHEN 0 THEN 'https://www.dietajavca.com.br/assets/marmita-1-DQu_smay.webp'
  WHEN 1 THEN 'https://www.dietajavca.com.br/assets/marmita-2-BJwnAIIQ.webp'
  WHEN 2 THEN 'https://www.dietajavca.com.br/assets/marmita-3-B7KV0LkU.webp'
END
FROM numbered n
WHERE f.id = n.id;
