
# Fix: Trigger generate_order_number Ignorando Pedidos Antigos por RLS

## Causa Raiz Encontrada

A funcao `generate_order_number()` roda com as permissoes do usuario que fez o INSERT (anon/cliente). A politica RLS "Recent orders viewable" so permite ver pedidos dos ultimos 5 minutos.

Resultado: quando o trigger calcula `MAX(order_number)`, ele so enxerga pedidos recentes. Se nao houver pedidos nos ultimos 5 minutos, MAX retorna 0, e ele tenta criar `DJA-0001` -- que ja existe. Erro 23505.

```text
Fluxo do bug:
  1. Cliente Bianca clica "Confirmar pedido"
  2. INSERT na tabela orders (usuario anon)
  3. Trigger generate_order_number dispara
  4. SELECT MAX(order_number) ... WHERE tenant_id = X
     -> RLS filtra: anon so ve pedidos dos ultimos 5 min
     -> Nenhum pedido recente -> MAX = NULL -> COALESCE = 0
  5. order_number = 'DJA-0001'
  6. ERRO: DJA-0001 ja existe! (unique constraint)
```

## Correcao

Alterar a funcao `generate_order_number()` para `SECURITY DEFINER`. Isso faz a funcao rodar com as permissoes do dono da tabela (postgres), ignorando RLS. Assim o SELECT ve TODOS os pedidos e calcula o MAX correto.

Unica mudanca: adicionar `SECURITY DEFINER` na definicao da funcao.

## Detalhes Tecnicos

### Migration SQL

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
1. **Migration SQL** -- adicionar `SECURITY DEFINER` na funcao `generate_order_number`
2. Nenhuma mudanca em codigo frontend ou edge function

### Risco
Zero. `SECURITY DEFINER` e o padrao recomendado para triggers que precisam acessar dados completos da tabela. O `SET search_path TO 'public'` ja esta presente, garantindo seguranca contra search_path injection.
