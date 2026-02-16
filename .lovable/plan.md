

# Correcao: Geracao de Order Number Duplicado

## Problema
A funcao `generate_order_number()` usa `COUNT(*) + 1` para gerar numeros sequenciais. Isso causa colisao quando pedidos sao deletados (o COUNT diminui mas os numeros antigos permanecem) ou quando dois pedidos sao criados simultaneamente.

## Solucao

### 1. Corrigir a funcao no banco de dados

Substituir `COUNT(*) + 1` por `MAX(sequencial) + 1`, extraindo o numero do ultimo order_number existente. Assim o proximo numero sera sempre maior que qualquer existente, mesmo que pedidos sejam deletados.

```text
Logica nova:
  - Extrair a parte numerica de todos os order_numbers do tenant (ex: "DJA-0045" -> 45)
  - Pegar o MAX + 1
  - Se nenhum pedido existir, comecar do 1
```

### 2. Adicionar retry no checkout (frontend)

No `CheckoutForm.tsx`, caso o insert falhe com erro de chave duplicada (codigo 23505), tentar novamente automaticamente ate 2 vezes. Isso cobre o cenario raro de dois clientes finalizando no exato mesmo milissegundo.

## Detalhes Tecnicos

### Migration SQL

Recriar a funcao trigger `generate_order_number`:

```text
CREATE OR REPLACE FUNCTION public.generate_order_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  max_seq INT;
BEGIN
  SELECT t.order_prefix INTO prefix
  FROM public.tenants t
  WHERE t.id = NEW.tenant_id;

  IF prefix IS NULL THEN
    prefix := 'DJA';
  END IF;

  SELECT COALESCE(
    MAX(
      NULLIF(regexp_replace(order_number, '^.*-', ''), '')::INT
    ),
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

### Frontend -- CheckoutForm.tsx

Na logica de insert de pedido, adicionar um `try/catch` que detecta o erro `23505` (unique_violation) e tenta o insert novamente (maximo 2 retries com delay de 500ms).

### Arquivos afetados
1. **Migration SQL** -- funcao `generate_order_number` (banco de dados)
2. **`src/components/CheckoutForm.tsx`** -- retry em caso de erro de chave duplicada

