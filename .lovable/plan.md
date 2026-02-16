

# Blindagem Total: Pedidos Sem Erro de Duplicata

## O que ja foi feito
- A funcao `generate_order_number` foi corrigida para usar MAX em vez de COUNT
- A edge function `create-asaas-pix` tem retry para erro 23505

## O que ainda pode falhar
Dois clientes finalizando no exato mesmo momento podem ler o mesmo MAX antes de qualquer um inserir, gerando colisao mesmo com retry (improvavel, mas possivel).

## Solucao Definitiva: Lock no Banco de Dados

Usar `pg_advisory_xact_lock` para que apenas uma transacao por vez crie pedidos para o mesmo tenant. Isso elimina 100% a possibilidade de colisao.

### Passo 1 -- Migration SQL

Atualizar a funcao trigger `generate_order_number` para incluir um advisory lock:

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
  -- Serializa a geracao de order_number por tenant
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

A unica mudanca e a linha `PERFORM pg_advisory_xact_lock(...)` no inicio. Isso garante que se dois INSERTs chegarem ao mesmo tempo, o segundo espera o primeiro terminar antes de calcular o proximo numero.

### Passo 2 -- Manter o retry na edge function

O retry ja implementado em `create-asaas-pix` continua como camada extra de seguranca, mas com o lock ele nunca devera ser acionado.

### Resultado

```text
Sem lock:
  Cliente A: SELECT MAX -> 45  |  INSERT DJA-0046  -> OK
  Cliente B: SELECT MAX -> 45  |  INSERT DJA-0046  -> ERRO (duplicata)

Com lock:
  Cliente A: LOCK -> SELECT MAX -> 45 -> INSERT DJA-0046 -> UNLOCK
  Cliente B: ESPERA... -> LOCK -> SELECT MAX -> 46 -> INSERT DJA-0047 -> UNLOCK
```

### Arquivos afetados
1. **Migration SQL** -- adicionar `pg_advisory_xact_lock` na funcao `generate_order_number`
2. Nenhuma mudanca no frontend ou edge function (retry ja existe como backup)

### Risco
Zero. O advisory lock e liberado automaticamente ao final da transacao e nao afeta performance em uso normal (cada lock dura milissegundos).

