UPDATE public.marmita_flavors
SET price_tiers_fit = NULL,
    price_tiers_fitness = NULL,
    price_override_fit = NULL,
    price_override_fitness = NULL
WHERE category = 'frangos';