

# Correção: "Saiu para Entrega" sem delay

## Problema
Quando você marca um pedido como "Saiu para Entrega" (`delivering`), a notificação entra na fila com 30 segundos de atraso (debounce) e só é processada no próximo ciclo do cron (até 10 minutos). O cliente demora para receber a mensagem.

## Solução
Mover o status `delivering` da lista de statuses com delay para a lista de envio imediato. Assim, a notificação de "Saiu para Entrega" será enviada na hora, sem passar pela fila.

## Detalhes Técnicos

**Arquivo:** `supabase/functions/send-status-notification/index.ts`

Alterar as listas de statuses:

```text
ANTES:
  IMMEDIATE_STATUSES = ["cancelled"]
  DEBOUNCE_STATUSES  = ["preparing", "ready", "delivering", "delivered"]

DEPOIS:
  IMMEDIATE_STATUSES = ["cancelled", "delivering"]
  DEBOUNCE_STATUSES  = ["preparing", "ready", "delivered"]
```

Com essa mudanca, ao marcar "Saiu para Entrega", o WhatsApp e o email serao disparados instantaneamente, sem passar pela tabela `pending_notifications`. Os demais statuses (em producao, pronto, entregue) continuam com o debounce de 30 segundos.

