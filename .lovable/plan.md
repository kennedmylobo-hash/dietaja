
# Plano: Corrigir Notificações Duplicadas

## Problema Identificado

As mensagens de "Pedido Confirmado" estão sendo enviadas **em duplicidade** porque existem **dois pontos de disparo** para WhatsApp:

| Ordem | Função Chamada | O que faz |
|-------|---------------|-----------|
| 1º | `send-order-approved` | Envia **Email + WhatsApp** (template `compraa_confrimadaa`) |
| 2º | `send-order-whatsapp` | Envia **WhatsApp novamente** (mesmo template) |

**Evidência na tabela `notification_events`** para pedido #DJA-0111:
- 01:42:21 → Email sent
- 01:42:22 → WhatsApp sent (1ª vez - via `send-order-approved`)
- 01:42:24 → WhatsApp sent (2ª vez - via `send-order-whatsapp`)

## Locais Afetados

1. **`asaas-webhook/index.ts`** (linhas 176-238) - Webhook de pagamento PIX
2. **`OrdersManager.tsx`** (linhas 688-717) - Confirmação manual no Admin
3. **`PendingOrdersRecovery.tsx`** (linhas 259-287) - Recuperação de pedidos pendentes

---

## Solução

**Remover a chamada duplicada de `send-order-whatsapp`** nesses 3 locais, já que `send-order-approved` já envia o WhatsApp.

### Arquivos a Alterar

**1. `supabase/functions/asaas-webhook/index.ts`**

Remover linhas 222-239 (chamada de `send-order-whatsapp`):

```typescript
// REMOVER ESTE BLOCO (linhas 222-239)
// Send WhatsApp confirmation
console.log('[asaas-webhook] Sending WhatsApp confirmation...');
try {
  await fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      order_id: orderId,
      status: 'approved',
    }),
  });
  console.log('[asaas-webhook] WhatsApp confirmation sent');
} catch (whatsappError) {
  console.error('[asaas-webhook] Error sending WhatsApp:', whatsappError);
}
```

**2. `src/components/admin/OrdersManager.tsx`**

Remover linhas 709-717 (chamada de `send-order-whatsapp`):

```typescript
// REMOVER ESTE BLOCO (linhas 709-717)
// Send WhatsApp confirmation
try {
  await supabase.functions.invoke('send-order-whatsapp', {
    body: { order_id: orderId, status: 'approved' }
  });
  console.log('✅ WhatsApp confirmation sent');
} catch (whatsappError) {
  console.error('Error sending WhatsApp:', whatsappError);
}
```

**3. `src/components/admin/PendingOrdersRecovery.tsx`**

Remover linhas 279-287 (chamada de `send-order-whatsapp`):

```typescript
// REMOVER ESTE BLOCO (linhas 279-287)
// Send WhatsApp confirmation
try {
  await supabase.functions.invoke('send-order-whatsapp', {
    body: { order_id: orderId, status: 'approved' }
  });
  console.log('✅ WhatsApp confirmation sent');
} catch (whatsappError) {
  console.error('WhatsApp confirmation error:', whatsappError);
}
```

---

## Resultado Esperado

Após a correção, quando um pedido for confirmado:

| Notificação | Quantidade | Via |
|------------|-----------|-----|
| Email | 1x | `send-order-approved` |
| WhatsApp | 1x | `send-order-approved` |

**Nenhuma duplicação.**

---

## Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `supabase/functions/asaas-webhook/index.ts` | Remover bloco de chamada `send-order-whatsapp` |
| `src/components/admin/OrdersManager.tsx` | Remover bloco de chamada `send-order-whatsapp` |
| `src/components/admin/PendingOrdersRecovery.tsx` | Remover bloco de chamada `send-order-whatsapp` |
