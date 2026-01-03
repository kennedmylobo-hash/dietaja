-- Add stock fields to marmita_flavors
ALTER TABLE public.marmita_flavors 
ADD COLUMN stock_quantity integer DEFAULT NULL,
ADD COLUMN show_stock boolean DEFAULT false NOT NULL;

-- Add stock fields to kit_soups
ALTER TABLE public.kit_soups 
ADD COLUMN stock_quantity integer DEFAULT NULL,
ADD COLUMN show_stock boolean DEFAULT false NOT NULL;

-- Add stock fields to kit_juices
ALTER TABLE public.kit_juices 
ADD COLUMN stock_quantity integer DEFAULT NULL,
ADD COLUMN show_stock boolean DEFAULT false NOT NULL;