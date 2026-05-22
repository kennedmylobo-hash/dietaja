UPDATE public.marmita_flavors
SET show_stock = true,
    stock_quantity = GREATEST(COALESCE(stock_quantity, 0), 10)
WHERE active = true
  AND (
    name ILIKE '%carne moída%'
    OR name ILIKE '%almôndeg%'
    OR name ILIKE '%frango desfiado%'
    OR name ILIKE '%frango em cubos%'
    OR name ILIKE '%estrogonofe%'
  );