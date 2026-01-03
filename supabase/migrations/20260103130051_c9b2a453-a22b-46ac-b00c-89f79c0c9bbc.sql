-- Create stock_movements table to track all stock changes
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('marmita_flavor', 'kit_soup', 'kit_juice')),
  item_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('production', 'sale', 'adjustment', 'initial')),
  quantity_before INTEGER,
  quantity_after INTEGER,
  quantity_change INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Admins can view all movements
CREATE POLICY "Admins can view stock movements"
ON public.stock_movements
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert movements
CREATE POLICY "Admins can insert stock movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert stock movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_stock_movements_item ON public.stock_movements(item_type, item_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);