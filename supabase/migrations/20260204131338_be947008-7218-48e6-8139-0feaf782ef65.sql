-- 1. Criar tabela de acompanhamentos
CREATE TABLE public.marmita_sides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weight_grams INTEGER NOT NULL DEFAULT 100,
  category TEXT DEFAULT 'acompanhamento',
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marmita_sides ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view marmita sides"
ON public.marmita_sides FOR SELECT
USING (true);

CREATE POLICY "Admins can manage marmita sides"
ON public.marmita_sides FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Dados iniciais
INSERT INTO public.marmita_sides (name, weight_grams, category, sort_order) VALUES
  ('Arroz', 200, 'carboidrato', 1),
  ('Feijão', 100, 'leguminosa', 2),
  ('Legumes', 100, 'vegetal', 3),
  ('Salada de legumes', 100, 'vegetal', 4),
  ('Aipim', 150, 'carboidrato', 5),
  ('Batata-doce', 150, 'carboidrato', 6),
  ('Mix de salada', 100, 'vegetal', 7),
  ('Grãos', 100, 'leguminosa', 8);

-- 3. Adicionar coluna sides na tabela marmita_flavors
ALTER TABLE public.marmita_flavors 
ADD COLUMN sides JSONB DEFAULT '[]'::jsonb;

-- 4. Corrigir emoji do Suco Rosa (melancia com hortelã)
UPDATE public.kit_juices 
SET emoji = '🍉' 
WHERE name = 'Suco Rosa';