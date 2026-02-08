

## Silenciar notificações para pedidos importados do WhatsApp

### Problema

Quando o admin muda o status de um pedido importado via WhatsApp (preparando, pronto, entregue, cancelado), o sistema dispara WhatsApp e e-mail para o cliente. Pedidos importados manualmente nao devem gerar nenhuma notificacao ao cliente em nenhum status.

### Como identificar pedidos importados

Os pedidos importados pelo WhatsApp ja possuem o campo `utm_data.source = 'whatsapp_import'`. Basta verificar esse campo antes de disparar notificacoes.

### Solucao

**Arquivo:** `src/components/admin/OrdersManager.tsx`

Adicionar uma verificacao antes de cada chamada a `sendStatusNotification`. Se o pedido tiver `utm_data.source === 'whatsapp_import'`, pular o envio.

**Mudanca 1 - Cancelamento (linha 546):**
```
// Antes:
sendStatusNotification(orderId, 'cancelled');

// Depois:
const isWhatsAppImport = currentOrder?.utm_data?.source === 'whatsapp_import';
if (!isWhatsAppImport) {
  sendStatusNotification(orderId, 'cancelled');
}
```

**Mudanca 2 - Mudanca de status geral (linhas 831-834):**
```
// Antes:
if (!['pending', 'whatsapp_pending'].includes(newStatus)) {
  sendStatusNotification(orderId, newStatus);
}

// Depois:
const currentOrderForNotif = orders.find(o => o.id === orderId);
const isWhatsAppImportStatus = currentOrderForNotif?.utm_data?.source === 'whatsapp_import';
if (!['pending', 'whatsapp_pending'].includes(newStatus) && !isWhatsAppImportStatus) {
  sendStatusNotification(orderId, newStatus);
}
```

### Resumo

| Arquivo | Mudanca |
|---|---|
| `src/components/admin/OrdersManager.tsx` | Linha 546: verificar `whatsapp_import` antes de notificar cancelamento |
| `src/components/admin/OrdersManager.tsx` | Linhas 831-834: verificar `whatsapp_import` antes de notificar mudanca de status |

Nenhum status (preparando, pronto, saiu para entrega, entregue, cancelado) vai disparar mensagem para o cliente quando o pedido vier do importador WhatsApp.
