

# Plano: Link de Rastreio para Entregas (iFood, 99, Uber, Motoboy)

## Objetivo

Quando o despachante clicar em **"Saiu p/ Entrega"**, aparecerá um campo opcional para colar o link de rastreio. O cliente receberá automaticamente esse link via WhatsApp e Email.

---

## Mudanças Necessárias

### 1. Banco de Dados - Novo Campo

Adicionar coluna `tracking_link` na tabela `orders`:

```sql
ALTER TABLE orders ADD COLUMN tracking_link TEXT;
```

### 2. Frontend - Modal de Link de Rastreio

Quando o status mudar para **"delivering"**, abrir um modal com:
- Campo de texto para colar o link (opcional)
- Botões: "Enviar sem link" e "Enviar com link"

**Arquivo:** `src/components/admin/OrdersManager.tsx`

### 3. Backend - Notificação com Link

A edge function `send-status-notification` passará a:
- Buscar o `tracking_link` do pedido
- Incluir na mensagem de WhatsApp e Email se existir

**Arquivo:** `supabase/functions/send-status-notification/index.ts`

---

## Fluxo do Usuário

```text
Despachante clica em "Saiu p/ Entrega"
             ↓
    Modal abre com campo de link
             ↓
     ┌───────────────────┐
     │ Cole o link aqui  │
     │ (opcional)        │
     └───────────────────┘
             ↓
     [Enviar sem link]  [Enviar com link]
             ↓
    Status atualizado + Notificação enviada
             ↓
    Cliente recebe WhatsApp/Email com link
```

---

## Mensagem de Exemplo (WhatsApp)

**SEM link:**
```
🛵 *Saiu para Entrega!*

Olá Maria! Seu pedido *#DJA-0079* está a caminho!

🔗 Acompanhe: https://dietajavca.com.br/pedido/DJA-0079
```

**COM link:**
```
🛵 *Saiu para Entrega!*

Olá Maria! Seu pedido *#DJA-0079* está a caminho!

📍 Rastreie em tempo real:
https://meupedido.ifood.com.br/49b7d5d5-9652...

🔗 Acompanhe: https://dietajavca.com.br/pedido/DJA-0079
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar coluna `tracking_link` |
| `OrdersManager.tsx` | Modal para colar link ao mudar para "delivering" |
| `send-status-notification/index.ts` | Incluir link na mensagem |

---

## Detalhes Técnicos

### Alterações no OrdersManager.tsx

1. Novo estado para controlar o modal de tracking:
   ```tsx
   const [trackingModal, setTrackingModal] = useState<{ orderId: string; show: boolean }>({ orderId: '', show: false });
   const [trackingLink, setTrackingLink] = useState('');
   ```

2. Modificar `updateOrderStatus` para abrir modal quando `newStatus === 'delivering'`

3. Nova função `sendToDelivery(orderId, link?)` que:
   - Salva o link no pedido
   - Atualiza status para "delivering"
   - Dispara notificação

### Alterações na Edge Function

1. Buscar campo `tracking_link` junto com os dados do pedido
2. Adicionar variável `{rastreio}` no `replaceVariables`
3. Modificar mensagem de status "delivering" para incluir link se existir

