-- Configurações do tenant para o /site
-- ATENÇÃO: Troque os placeholders YOUR_* pelas chaves reais depois

-- 1. Atualizar tenant Dieta Já com defaults sensatos para o /site
UPDATE public.tenants SET
  delivery_fee = 0, -- frete grátis acima de R$ 290, controle via delivery_zones
  whatsapp = '5577991001658',
  whatsapp_formatted = '(77) 99100-1658',
  cutoff_day = 0, -- domingo
  cutoff_time = '18:00:00',
  production_day = 2, -- terça
  delivery_days = '{1, 3, 5}', -- segunda, quarta, sexta
  cutoff_message = 'Pedidos até domingo às 18h são produzidos na terça e entregues a partir de quarta.',
  facebook_pixel_id = COALESCE(facebook_pixel_id, ''),
  google_analytics_id = COALESCE(google_analytics_id, ''),
  og_image_url = COALESCE(og_image_url, '')
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Seed delivery zones (bairros de Vitória da Conquista)
INSERT INTO public.delivery_zones (tenant_id, name, neighborhoods, fee, estimated_time, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Zona Centro', ARRAY['Centro', 'Recreio', 'Candeias', 'Alto Maron', 'Brasil'], 0, '30-50 min', 1),
  ('00000000-0000-0000-0000-000000000001', 'Zona Sul', ARRAY['Felícia', 'Jurema', 'Patagônia', 'Morada dos Pássaros', 'São Vicente'], 0, '40-60 min', 2),
  ('00000000-0000-0000-0000-000000000001', 'Zona Leste', ARRAY['Boavista', 'Kakau', 'Bateias', 'Urbis VI', 'Conveima'], 5, '45-65 min', 3),
  ('00000000-0000-0000-0000-000000000001', 'Zona Oeste', ARRAY['Campinhos', 'Vila América', 'Nossa Senhora Aparecida', 'Santa Mônica', 'Ibirapuera'], 5, '50-70 min', 4),
  ('00000000-0000-0000-0000-000000000001', 'Zona Norte', ARRAY['Cidade Maravilhosa', 'Lagoa das Flores', 'Capinal', 'Vila Serrana', 'São Sebastião'], 8, '50-70 min', 5)
ON CONFLICT DO NOTHING;

-- 3. Adicionar novas categorias no menu_categories
INSERT INTO public.menu_categories (slug, name, short_name, icon, type, sort_order, active)
VALUES
  ('peixes', 'Marmitas: Peixes', 'Peixes', '🐟', 'marmita', 6, true),
  ('vegetariano', 'Marmitas: Vegetariano', 'Veg', '🥬', 'marmita', 7, true),
  ('sopas', 'Sopas Funcionais', 'Sopas', '🍜', 'marmita', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Garantir que sabores existentes tenham tenant_id do tenant padrão
UPDATE public.marmita_flavors SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.marmita_packages SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
