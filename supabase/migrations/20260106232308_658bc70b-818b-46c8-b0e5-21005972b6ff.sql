-- Create menu_categories table for dynamic category management
CREATE TABLE public.menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  type TEXT NOT NULL CHECK (type IN ('kit', 'marmita')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active categories" 
ON public.menu_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage categories" 
ON public.menu_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_menu_categories_updated_at
BEFORE UPDATE ON public.menu_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial categories
INSERT INTO public.menu_categories (slug, name, short_name, icon, type, sort_order, active) VALUES
('kits', 'Kits Detox', 'Kits', '🥤', 'kit', 1, true),
('carnes', 'Marmitas: Carnes', 'Carnes', '🥩', 'marmita', 2, true),
('frangos', 'Marmitas: Frangos', 'Frangos', '🍗', 'marmita', 3, true),
('massas', 'Marmitas: Massas', 'Massas', '🍝', 'marmita', 4, true),
('especiais', 'Marmitas: Especiais', 'Especiais', '⭐', 'marmita', 5, true);