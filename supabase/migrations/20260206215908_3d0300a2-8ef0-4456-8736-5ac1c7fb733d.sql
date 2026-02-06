
-- Create tenant_landing_content table
CREATE TABLE public.tenant_landing_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, section_key)
);

-- Enable RLS
ALTER TABLE public.tenant_landing_content ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can read to render landing pages)
CREATE POLICY "Anyone can view landing content"
  ON public.tenant_landing_content
  FOR SELECT
  USING (true);

-- Admin of the tenant can manage
CREATE POLICY "Admins can manage their landing content"
  ON public.tenant_landing_content
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_current_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_tenant_landing_content_updated_at
  BEFORE UPDATE ON public.tenant_landing_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create tenant-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-assets', 'tenant-assets', true);

-- Public read policy for tenant-assets
CREATE POLICY "Anyone can view tenant assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tenant-assets');

-- Admins can upload to their tenant folder
CREATE POLICY "Admins can upload tenant assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Admins can update their tenant assets
CREATE POLICY "Admins can update tenant assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tenant-assets'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Admins can delete their tenant assets
CREATE POLICY "Admins can delete tenant assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tenant-assets'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Seed default content for Dieta Já tenant
INSERT INTO public.tenant_landing_content (tenant_id, section_key, content, is_visible, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', 'hero', '{
  "title": "Coma melhor mesmo sem tempo —",
  "title_highlight": "e sinta seu corpo responder.",
  "subtitle": "Alimentação saudável pronta para quem tem rotina corrida em",
  "badges": [
    {"emoji": "📍", "text": "Retirada grátis"},
    {"emoji": "⚡", "text": "Pronto em 3 min"},
    {"emoji": "✅", "text": "Garantia total"}
  ],
  "social_proof_rating": "+200 kits entregues",
  "social_proof_satisfaction": "98% de satisfação",
  "background_type": "video",
  "background_url": ""
}'::jsonb, true, 1),

('00000000-0000-0000-0000-000000000001', 'identification', '{
  "title": "Você se identifica com alguma dessas situações?",
  "items": [
    "Não tem tempo para cozinhar durante a semana",
    "Quer emagrecer mas não sabe por onde começar",
    "Já tentou dietas restritivas e não conseguiu manter",
    "Precisa de praticidade sem abrir mão da saúde"
  ]
}'::jsonb, true, 2),

('00000000-0000-0000-0000-000000000001', 'testimonials', '{
  "items": [
    {"name": "Mariana S.", "role": "Perdeu 8kg em 2 meses", "quote": "As marmitas são deliciosas e super práticas! Perdi peso sem sofrimento.", "initials": "MS"},
    {"name": "Carla R.", "role": "Cliente há 6 meses", "quote": "Melhor investimento que fiz na minha saúde. Recomendo demais!", "initials": "CR"},
    {"name": "Juliana M.", "role": "Perdeu 5kg em 1 mês", "quote": "Finalmente encontrei algo que funciona com minha rotina corrida.", "initials": "JM"}
  ]
}'::jsonb, true, 3),

('00000000-0000-0000-0000-000000000001', 'solution', '{
  "title": "A solução completa para sua alimentação",
  "subtitle": "Tudo o que você precisa para comer bem sem complicação",
  "features": [
    {"icon": "🥗", "title": "Cardápio Variado", "description": "Opções para todos os gostos e objetivos"},
    {"icon": "📦", "title": "Entrega Prática", "description": "Receba em casa ou retire no ponto"},
    {"icon": "👨‍🍳", "title": "Chef Profissional", "description": "Preparado por nutricionista e chef"},
    {"icon": "💰", "title": "Preço Justo", "description": "Mais barato que cozinhar em casa"}
  ]
}'::jsonb, true, 4),

('00000000-0000-0000-0000-000000000001', 'before_after', '{
  "before_title": "Antes do Dieta Já",
  "before_items": ["Sem tempo para cozinhar", "Comendo fast food", "Sem energia", "Peso aumentando"],
  "after_title": "Depois do Dieta Já",
  "after_items": ["Refeições prontas e saudáveis", "Alimentação balanceada", "Mais energia e disposição", "Peso controlado"]
}'::jsonb, true, 5),

('00000000-0000-0000-0000-000000000001', 'product_gallery', '{
  "title": "Conheça nossos produtos",
  "badges": ["🔥 Mais vendido", "⭐ Favorito"],
  "background_type": "video",
  "background_url": ""
}'::jsonb, true, 6),

('00000000-0000-0000-0000-000000000001', 'banners', '{
  "items": [
    {"title": "🔥 Kit Emagrecimento", "subtitle": "O mais vendido!", "description": "5 marmitas balanceadas para sua semana"},
    {"title": "💪 Kit Ganho de Massa", "subtitle": "Para quem treina!", "description": "Refeições hiperproteicas e calóricas"},
    {"title": "🥤 Kit Detox", "subtitle": "Renove seu corpo!", "description": "Sucos e sopas detox para 3 ou 5 dias"}
  ]
}'::jsonb, true, 7),

('00000000-0000-0000-0000-000000000001', 'guarantee', '{
  "items": [
    {"icon": "🛡️", "title": "Garantia de Satisfação", "description": "Se não gostar, devolvemos seu dinheiro"},
    {"icon": "❄️", "title": "Qualidade Garantida", "description": "Embalagens térmicas e ingredientes frescos"},
    {"icon": "🔒", "title": "Pagamento Seguro", "description": "PIX com confirmação instantânea"}
  ]
}'::jsonb, true, 8),

('00000000-0000-0000-0000-000000000001', 'faq', '{
  "items": [
    {"question": "Como funciona a entrega?", "answer": "Entregamos toda segunda-feira. Você pode optar por delivery ou retirada no ponto."},
    {"question": "As marmitas são congeladas?", "answer": "Sim, todas são ultracongeladas para manter a qualidade e praticidade."},
    {"question": "Posso escolher os sabores?", "answer": "Sim! Você escolhe seus sabores favoritos ao montar seu kit."},
    {"question": "Qual a validade?", "answer": "As marmitas duram até 90 dias no freezer."},
    {"question": "Como aquecer?", "answer": "Basta aquecer no micro-ondas por 3-5 minutos. Prático e rápido!"}
  ]
}'::jsonb, true, 9),

('00000000-0000-0000-0000-000000000001', 'custom_diet', '{
  "title": "Dieta Personalizada",
  "subtitle": "Monte seu plano alimentar sob medida",
  "description": "Nosso nutricionista cria um cardápio exclusivo para seus objetivos"
}'::jsonb, true, 10);
