-- Add low_stock_threshold column to flavor tables
ALTER TABLE public.marmita_flavors ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.kit_soups ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.kit_juices ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;