

# Plano: Sistema de Debounce para Notificações de Status

## Problema Identificado

Quando o atendente muda o status de um pedido várias vezes rapidamente (ex: `preparing` → `ready` → `delivering` → `delivered`), o cliente recebe **todas as mensagens** de cada etapa.

**Exemplo da imagem:** Bianca recebeu 5 mensagens em sequência para o pedido DJA-0108:
- "Suas marmitas estão sendo preparadas!" (preparing)
- "Pedido Pronto!" (ready)
- "Pedido a Caminho!" (delivering) - 2x
- "Pedido Entregue!" (delivered)

**Comportamento desejado:** Se múltiplas mudanças de status ocorrerem em menos de 30 segundos, enviar apenas a **última** (mais importante).

---

## Solução: Debounce com Tabela de Fila

A estratégia é criar uma **fila de notificações pendentes** no banco de dados. Quando uma notificação é solicitada:

1. **Verificar se já existe** uma notificação pendente para aquele pedido
2. **Se existir:** Atualizar o status para o novo (mais recente), resetar o timer
3. **Se não existir:** Criar nova entrada na fila
4. **Background job:** Processar notificações após 30 segundos de "silêncio"

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Nova tabela** `pending_notifications` | Armazenar notificações aguardando envio |
| `supabase/functions/send-status-notification/index.ts` | Adicionar lógica de debounce |
| **Nova Edge Function** `process-pending-notifications` | Processar fila após delay |

---

## Detalhes Técnicos

### 1. Criar Tabela `pending_notifications`

```sql
CREATE TABLE public.pending_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 seconds'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id) -- Apenas uma notificação pendente por pedido
);

-- Habilitar realtime para trigger
ALTER PUBLICATION supabase_realtime ADD TABLE pending_notifications;

-- RLS: apenas serviço pode acessar
ALTER TABLE pending_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON pending_notifications FOR ALL USING (false);
```

### 2. Modificar `send-status-notification/index.ts`

Ao receber uma solicitação de notificação:

```typescript
// Verificar se já existe notificação pendente para este pedido
const { data: existingPending } = await supabase
  .from('pending_notifications')
  .select('id')
  .eq('order_id', order_id)
  .single();

if (existingPending) {
  // Atualizar status e resetar timer
  await supabase
    .from('pending_notifications')
    .update({ 
      status: new_status, 
      scheduled_for: new Date(Date.now() + 30000).toISOString() 
    })
    .eq('order_id', order_id);
  
  console.log(`[DEBOUNCE] Updated pending notification for ${order_id} to ${new_status}`);
  return { success: true, debounced: true };
}

// Criar nova notificação pendente
await supabase
  .from('pending_notifications')
  .insert({ 
    order_id, 
    status: new_status,
    scheduled_for: new Date(Date.now() + 30000).toISOString()
  });

console.log(`[DEBOUNCE] Queued notification for ${order_id}: ${new_status}`);
return { success: true, queued: true };
```

### 3. Nova Edge Function `process-pending-notifications`

Processador que roda via cron (a cada 10 segundos):

```typescript
// Buscar notificações que já passaram do tempo de espera
const { data: pendingNotifications } = await supabase
  .from('pending_notifications')
  .select('*')
  .lte('scheduled_for', new Date().toISOString());

for (const notification of pendingNotifications) {
  // Processar a notificação (enviar WhatsApp/Email)
  await sendActualNotification(notification.order_id, notification.status);
  
  // Remover da fila
  await supabase
    .from('pending_notifications')
    .delete()
    .eq('id', notification.id);
}
```

### 4. Configurar Cron no config.toml

```toml
[functions.process-pending-notifications]
verify_jwt = false
schedule = "*/10 * * * * *"  # A cada 10 segundos
```

---

## Fluxo Visual

```text
┌─────────────────┐
│ Admin clica     │
│ "Em Produção"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────┐
│ Fila pendente   │────▶│ Timer: 30 segundos  │
│ status=preparing│     └─────────────────────┘
└────────┬────────┘
         │ (Admin clica novamente em 5s)
         ▼
┌─────────────────┐     ┌─────────────────────┐
│ Atualiza fila   │────▶│ Timer RESET: 30s    │
│ status=ready    │     └─────────────────────┘
└────────┬────────┘
         │ (Admin clica novamente em 3s)
         ▼
┌─────────────────┐     ┌─────────────────────┐
│ Atualiza fila   │────▶│ Timer RESET: 30s    │
│ status=delivered│     └─────────────────────┘
└─────────────────┘
         │
         │ (30 segundos sem mudança)
         ▼
┌─────────────────┐
│ Envia apenas:   │
│ "Pedido Entregue"│
└─────────────────┘
```

---

## Resultado Esperado

- **Antes:** Admin muda 4 status em 2 minutos → Cliente recebe 4 mensagens
- **Depois:** Admin muda 4 status em 2 minutos → Cliente recebe apenas 1 mensagem (a última)

**O delay de 30 segundos é configurável e pode ser ajustado conforme necessário.**

---

## Casos Especiais

1. **Status `delivered`:** Sempre envia imediatamente (é o status final)
2. **Status `cancelled`:** Sempre envia imediatamente (crítico)
3. **Email:** Continua enviando normalmente (só WhatsApp tem debounce)

Isso garante que o cliente sempre receba confirmação de entrega/cancelamento sem delay.

