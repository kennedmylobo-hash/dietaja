

# Fix: Adicionar SECURITY DEFINER ao trigger generate_order_number

## Problema
A funcao `generate_order_number()` NAO tem `SECURITY DEFINER`. O advisory lock foi aplicado, mas sem SECURITY DEFINER o RLS continua filtrando pedidos antigos. Resultado: MAX retorna 0 e tenta criar DJA-0001, que ja existe.

## Correcao
Uma unica migration SQL para recriar a funcao com `SECURITY DEFINER`.

## Detalhes Tecnicos

### Migration SQL

Recriar a funcao adicionando `SECURITY DEFINER`:

```text
CREATE OR REPLACE FUNCTION public.generate_order_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  max_seq INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('order_number_' || NEW.tenant_id::text));

  SELECT t.order_prefix INTO prefix
  FROM public.tenants t
  WHERE t.id = NEW.tenant_id;

  IF prefix IS NULL THEN
    prefix := 'DJA';
  END IF;

  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(order_number, '^.*-', ''), '')::INT),
    0
  ) + 1
  INTO max_seq
  FROM public.orders
  WHERE tenant_id = NEW.tenant_id;

  NEW.order_number := prefix || '-' || LPAD(max_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
```

### Arquivos afetados
1. **Migration SQL** -- adicionar `SECURITY DEFINER` na funcao
2. Nenhuma mudanca em codigo frontend ou edge function

### Risco
Zero. `SECURITY DEFINER` com `SET search_path TO 'public'` e o padrao seguro recomendado para triggers que precisam acessar dados completos.

