
-- Tabela de pacotes de marmitas
CREATE TABLE public.marmita_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sabores de marmitas
CREATE TABLE public.marmita_flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('carnes', 'frangos', 'massas', 'especiais')),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de kits detox
CREATE TABLE public.kit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  days INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sopas dos kits
CREATE TABLE public.kit_soups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji TEXT NOT NULL DEFAULT '🍲',
  name TEXT NOT NULL,
  ingredients TEXT,
  benefit TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sucos dos kits
CREATE TABLE public.kit_juices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji TEXT NOT NULL DEFAULT '🥤',
  name TEXT NOT NULL,
  ingredients TEXT,
  benefit TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Triggers para updated_at
CREATE TRIGGER update_marmita_packages_updated_at
BEFORE UPDATE ON public.marmita_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kit_packages_updated_at
BEFORE UPDATE ON public.kit_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.marmita_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marmita_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_soups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_juices ENABLE ROW LEVEL SECURITY;

-- Políticas: SELECT público para o site
CREATE POLICY "Anyone can view active marmita packages" ON public.marmita_packages
FOR SELECT USING (true);

CREATE POLICY "Anyone can view marmita flavors" ON public.marmita_flavors
FOR SELECT USING (true);

CREATE POLICY "Anyone can view kit packages" ON public.kit_packages
FOR SELECT USING (true);

CREATE POLICY "Anyone can view kit soups" ON public.kit_soups
FOR SELECT USING (true);

CREATE POLICY "Anyone can view kit juices" ON public.kit_juices
FOR SELECT USING (true);

-- Políticas: INSERT/UPDATE/DELETE apenas para admins
CREATE POLICY "Admins can manage marmita packages" ON public.marmita_packages
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage marmita flavors" ON public.marmita_flavors
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage kit packages" ON public.kit_packages
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage kit soups" ON public.kit_soups
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage kit juices" ON public.kit_juices
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir dados iniciais: Pacotes de Marmitas
INSERT INTO public.marmita_packages (name, quantity, unit_price, active, popular, sort_order) VALUES
('Pacote 7 Marmitas', 7, 25.90, true, false, 1),
('Pacote 14 Marmitas', 14, 23.90, true, true, 2),
('Pacote 28 Marmitas', 28, 19.90, true, false, 3);

-- Inserir dados iniciais: Sabores de Marmitas
INSERT INTO public.marmita_flavors (name, category, sort_order) VALUES
-- Carnes
('Carne de Panela com Legumes', 'carnes', 1),
('Carne Moída ao Sugo', 'carnes', 2),
('Carne Acebolada', 'carnes', 3),
('Estrogonofe de Carne', 'carnes', 4),
('Carne de Sol Desfiada', 'carnes', 5),
('Cubos de Carne ao Molho Madeira', 'carnes', 6),
('Carne com Brócolis', 'carnes', 7),
('Músculo Desfiado', 'carnes', 8),
-- Frangos
('Frango Grelhado', 'frangos', 1),
('Frango Desfiado', 'frangos', 2),
('Estrogonofe de Frango', 'frangos', 3),
('Frango Xadrez', 'frangos', 4),
('Frango à Parmegiana (assado)', 'frangos', 5),
('Frango com Legumes', 'frangos', 6),
('Cubos de Frango ao Molho', 'frangos', 7),
('Frango ao Curry', 'frangos', 8),
('Sobrecoxa Grelhada', 'frangos', 9),
-- Massas
('Espaguete à Bolonhesa', 'massas', 1),
('Macarrão ao Sugo', 'massas', 2),
('Espaguete Alho e Óleo com Frango', 'massas', 3),
('Macarrão com Carne Moída', 'massas', 4),
('Lasanha de Frango', 'massas', 5),
('Lasanha à Bolonhesa', 'massas', 6),
('Nhoque ao Sugo', 'massas', 7),
('Panqueca de Carne', 'massas', 8),
('Panqueca de Frango', 'massas', 9),
('Escondidinho de Carne', 'massas', 10),
('Escondidinho de Frango', 'massas', 11),
-- Especiais
('Peixe Grelhado com Legumes', 'especiais', 1),
('Omelete de Legumes', 'especiais', 2),
('Omelete de Frango', 'especiais', 3),
('Legumes Salteados (Vegano)', 'especiais', 4),
('Feijoada Light', 'especiais', 5),
('Arroz de Carreteiro', 'especiais', 6),
('Strogonoff de Cogumelos (Vegano)', 'especiais', 7),
('Moqueca de Peixe', 'especiais', 8);

-- Inserir dados iniciais: Kits Detox
INSERT INTO public.kit_packages (name, days, price, description, features, popular, sort_order) VALUES
('Kit 3 Dias', 3, 199.00, 'Ideal para iniciantes', '["12 sucos detox", "6 sopas funcionais", "Cardápio rotativo"]'::jsonb, false, 1),
('Kit 5 Dias', 5, 299.00, 'Mais vendido! Resultados visíveis', '["20 sucos detox", "10 sopas funcionais", "Acompanhamento nutricional"]'::jsonb, true, 2),
('Kit 7 Dias', 7, 399.00, 'Transformação completa', '["28 sucos detox", "14 sopas funcionais", "Suporte exclusivo WhatsApp"]'::jsonb, false, 3);

-- Inserir dados iniciais: Sopas
INSERT INTO public.kit_soups (emoji, name, ingredients, benefit, sort_order) VALUES
('🎃', 'Abóbora Termogênica', 'Abóbora, gengibre, cúrcuma, pimenta', 'termogênico', 1),
('🥔', 'Aipim Cremoso', 'Aipim, alho-poró, salsinha, azeite', 'saciedade', 2),
('🍠', 'Batata-doce Nutritiva', 'Batata-doce, cenoura, couve, gengibre', 'energia', 3);

-- Inserir dados iniciais: Sucos
INSERT INTO public.kit_juices (emoji, name, ingredients, benefit, sort_order) VALUES
('🥬', 'Verde Detox', 'Couve, pepino, maçã verde, limão, gengibre', 'detox', 1),
('🍇', 'Rosa Antioxidante', 'Beterraba, morango, maçã, limão', 'antioxidante', 2),
('🍊', 'Amarelo Energético', 'Laranja, cenoura, maçã, gengibre, cúrcuma', 'energia', 3),
('🍅', 'Vermelho Vitaminado', 'Tomate, cenoura, beterraba, maçã, limão', 'vitaminas', 4);
