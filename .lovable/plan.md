

# Plano: Corrigir Mensagens Duplicadas e Exibir Link de Rastreio

## Problema 1: Mensagens WhatsApp Duplicadas (DJA-0112)

### Diagnóstico

Analisando os logs da tabela `notification_events`, identifiquei **3 envios** do template `compraa_confrimadaa` para o pedido DJA-0112:

| Hora | Message ID | Origem |
|------|------------|--------|
| 21:33:14 | `1718a7fc-...` | Primeira aprovação manual |
| 23:12:25 | `901e3346-...` | Segunda notificação duplicada |
| 23:12:31 | `f8c70705-...` | Terceira notificação duplicada |

**Causa raiz:** Há **duas fontes** disparando notificações de aprovação simultaneamente:

1. **`send-order-approved`** - Chamada pelo `OrdersManager.tsx` quando admin confirma manualmente (linha 689)
2. **`send-status-notification`** - Chamada por `updateOrderStatus` após qualquer mudança de status (linha 813)

Quando o status muda para `approved`, **ambas as funções** enviam o template `compraa_confrimadaa`, causando duplicação.

### Solução

Modificar a função `send-status-notification` para **excluir** o status `approved` dos envios de WhatsApp, já que ele é tratado exclusivamente pela função `send-order-approved`.

**Arquivo:** `supabase/functions/send-status-notification/index.ts`

**Alteração (linhas 422-430):**

```typescript
// For approved status, SKIP WhatsApp since it's handled by send-order-approved
if (new_status === "approved") {
  console.log("[STATUS] Skipping WhatsApp for approved - handled by send-order-approved");
  // Only send email for approved status here (email still needed as backup)
} else if (whatsappMessage) {
  // For other statuses, use text message
  promises.push(sendWhatsAppText(order.customer_phone, whatsappMessage, order.order_number));
}
```

---

## Problema 2: Link de Rastreio do iFood Não Aparece (DJA-0108)

### Diagnóstico

O pedido DJA-0108 **tem** o link de rastreio no banco de dados:
```
tracking_link: https://meupedido.ifood.com.br/ad751108-fdde-480b-adf0-161d06bc0b7e?utm_source=copy_link
```

Porém, a página `/pedido/:orderNumber` **não está recebendo** o campo `tracking_link`:

**Edge Function `get-order-status`** - Linha 53:
```typescript
.select("order_number, status, customer_name, created_at, items, total, delivery_option, paid_at")
// ❌ FALTA: tracking_link
```

**Interface `OrderStatusResponse`** (linha 14):
```typescript
interface OrderStatusResponse {
  // ❌ FALTA: tracking_link?: string;
}
```

**Página `StatusPedido.tsx`** - Interface `OrderStatus` (linha 27):
```typescript
interface OrderStatus {
  // ❌ FALTA: tracking_link?: string;
}
```

E não há renderização do link de rastreio na página.

### Solução

1. **Atualizar a Edge Function `get-order-status`** para incluir `tracking_link` na query
2. **Atualizar a página `StatusPedido.tsx`** para exibir o link de rastreio quando disponível

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-status-notification/index.ts` | Excluir status `approved` do envio de WhatsApp |
| `supabase/functions/get-order-status/index.ts` | Adicionar `tracking_link` na query SQL |
| `src/pages/StatusPedido.tsx` | Adicionar `tracking_link` na interface e renderizar link na UI |

---

## Detalhes Técnicos

### 1. send-status-notification/index.ts

Alterar o bloco de envio de WhatsApp (linhas 422-434):

```typescript
// ANTES:
if (new_status === "approved") {
  const templateFields = {...};
  promises.push(sendWhatsAppTemplate(...));
} else if (whatsappMessage) {
  promises.push(sendWhatsAppText(...));
}

// DEPOIS:
if (new_status === "approved") {
  // Skip WhatsApp - handled exclusively by send-order-approved to prevent duplicates
  console.log("[STATUS] Skipping WhatsApp for approved status - handled by send-order-approved");
} else if (whatsappMessage) {
  promises.push(sendWhatsAppText(order.customer_phone, whatsappMessage, order.order_number));
}
```

### 2. get-order-status/index.ts

Adicionar `tracking_link` na query (linha 53):

```typescript
.select("order_number, status, customer_name, created_at, items, total, delivery_option, paid_at, tracking_link")
```

Adicionar na interface (linha 22):

```typescript
interface OrderStatusResponse {
  // ... campos existentes ...
  tracking_link: string | null;
}
```

Adicionar no objeto de resposta (linha 85):

```typescript
const response: OrderStatusResponse = {
  // ... campos existentes ...
  tracking_link: order.tracking_link,
};
```

### 3. StatusPedido.tsx

Adicionar na interface `OrderStatus`:

```typescript
interface OrderStatus {
  // ... campos existentes ...
  tracking_link?: string | null;
}
```

Adicionar seção de rastreio na UI (após o resumo do pedido):

```tsx
{/* Tracking Link Section */}
{order.tracking_link && order.status === 'delivering' && (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
    <p className="text-amber-800 font-medium mb-2">
      Acompanhe sua entrega em tempo real
    </p>
    <Button asChild className="bg-amber-600 hover:bg-amber-700">
      <a href={order.tracking_link} target="_blank" rel="noopener noreferrer">
        <Truck className="w-4 h-4 mr-2" />
        Rastrear Entrega
      </a>
    </Button>
  </div>
)}
```

---

## Resultado Esperado

1. **Mensagens duplicadas:** Cliente receberá apenas **1 mensagem** de confirmação de pedido aprovado
2. **Link de rastreio:** Ao acessar `/pedido/DJA-0108`, o cliente verá um botão destacado para abrir o rastreio do iFood/99/Uber

