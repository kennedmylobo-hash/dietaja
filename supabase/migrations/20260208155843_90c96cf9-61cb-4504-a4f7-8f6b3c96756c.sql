
-- Atualizar estrogonofe de FRANGO (fit)
UPDATE marmita_flavors
SET sides = jsonb_set(
  sides,
  '{fit}',
  (SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Estrogonofe'
    THEN jsonb_set(elem, '{name}', '"Estrogonofe de frango"')
    ELSE elem END
  ) FROM jsonb_array_elements(sides->'fit') elem)
)
WHERE lower(name) LIKE '%estrogonofe%frango%'
  AND sides->'fit' IS NOT NULL;

-- Mesmo para fitness
UPDATE marmita_flavors
SET sides = jsonb_set(
  sides,
  '{fitness}',
  (SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Estrogonofe'
    THEN jsonb_set(elem, '{name}', '"Estrogonofe de frango"')
    ELSE elem END
  ) FROM jsonb_array_elements(sides->'fitness') elem)
)
WHERE lower(name) LIKE '%estrogonofe%frango%'
  AND sides->'fitness' IS NOT NULL;

-- Atualizar estrogonofe de CARNE (fit)
UPDATE marmita_flavors
SET sides = jsonb_set(
  sides,
  '{fit}',
  (SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Estrogonofe'
    THEN jsonb_set(elem, '{name}', '"Estrogonofe de carne"')
    ELSE elem END
  ) FROM jsonb_array_elements(sides->'fit') elem)
)
WHERE lower(name) LIKE '%estrogonofe%carne%'
  AND sides->'fit' IS NOT NULL;

-- Mesmo para fitness
UPDATE marmita_flavors
SET sides = jsonb_set(
  sides,
  '{fitness}',
  (SELECT jsonb_agg(
    CASE WHEN elem->>'name' = 'Estrogonofe'
    THEN jsonb_set(elem, '{name}', '"Estrogonofe de carne"')
    ELSE elem END
  ) FROM jsonb_array_elements(sides->'fitness') elem)
)
WHERE lower(name) LIKE '%estrogonofe%carne%'
  AND sides->'fitness' IS NOT NULL;
