

## Separar Estrogonofe de Frango e de Carne na Ficha de Producao

### Problema
No banco de dados, todos os sabores de estrogonofe (frango e carne) estao com o ingrediente proteina cadastrado como apenas "Estrogonofe". Isso faz com que o sistema some tudo junto na ficha de producao, sem distinguir frango de carne.

### Solucao (2 partes)

**Parte 1 - Corrigir dados no banco**

Atualizar o campo `sides` de todos os sabores de estrogonofe para usar nomes especificos:
- "Estrogonofe de frango" nos sabores que contem "frango" no nome
- "Estrogonofe de carne" nos sabores que contem "carne" no nome

Isso envolve um migration SQL que faz UPDATE em `marmita_flavors` para trocar `"Estrogonofe"` por `"Estrogonofe de frango"` ou `"Estrogonofe de carne"` no JSONB `sides`, cobrindo ambas as linhas (fit e fitness).

**Parte 2 - Prevenir no codigo**

Ajustar a funcao `extractProteinName` em `src/lib/flavor-description.ts` para que, quando o nome do sabor contem "estrogonofe de [algo]", preserve o nome completo (ex: "Estrogonofe de frango") em vez de simplificar para apenas "Estrogonofe".

Atualmente o split por "com" ja faz isso corretamente (`"estrogonofe de frango com aipim..."` gera `"Estrogonofe de frango"`), entao o `generateDefaultSides` ja funciona bem. O problema e exclusivamente nos dados salvos no banco.

### Resultado Esperado
Na ficha de producao, os totais de proteina mostrarao:
- Estrogonofe de frango: Xg
- Estrogonofe de carne: Yg

Em vez de um unico "Estrogonofe: X+Yg".

### Detalhes Tecnicos

**Migration SQL:**
```sql
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
```

**Nenhuma alteracao de codigo e necessaria** - o `generateDefaultSides` ja extrai corretamente "Estrogonofe de frango" / "Estrogonofe de carne" do nome do sabor. O problema era apenas nos dados ja salvos no banco.
