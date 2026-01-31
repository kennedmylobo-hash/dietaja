
# Plano: Otimizar Tempo de Carregamento do Checkout PIX

## Problema Atual

O checkout está lento porque executa várias operações **sequencialmente** quando poderiam ser **paralelas** ou **em background**:

```text
Fluxo Atual (Sequencial):
┌────────────────────────────────────────────────────────────────────┐
│ 1. Frontend cria conta do cliente      → ~500ms (await)           │
│ 2. Frontend insere pedido no DB        → ~200ms                   │
│ 3. Frontend envia email de confirmação → ~1-2s (await!)           │
│ 4. Frontend chama create-asaas-pix     → ??? ms                   │
│    ├─ Busca cliente no Asaas           → ~300ms                   │
│    ├─ Cria/atualiza cliente            → ~300ms                   │
│    ├─ Cria cobrança PIX                → ~400ms                   │
│    ├─ Busca QR Code                    → ~300ms                   │
│    ├─ Atualiza pedido no DB            → ~100ms                   │
│    └─ Envia WhatsApp                   → ~500ms (await!)          │
│                                                                    │
│ Total Aproximado: 3.5-4.5 segundos!                               │
└────────────────────────────────────────────────────────────────────┘
```

---

## Solução Proposta

Mover operações não-críticas para **background** e remover etapas duplicadas.

```text
Fluxo Otimizado:
┌────────────────────────────────────────────────────────────────────┐
│ 1. Frontend chama create-asaas-pix diretamente                    │
│    ├─ Busca/cria cliente no Asaas      → ~400ms                   │
│    ├─ Cria cobrança PIX                → ~400ms                   │
│    ├─ Busca QR Code                    → ~300ms                   │
│    └─ Retorna resposta (QR Code)                                  │
│                                                                    │
│ Total: ~1-1.5 segundos                                            │
│                                                                    │
│ (Em background - não bloqueia UI):                                │
│    → Atualiza pedido no DB                                        │
│    → Envia WhatsApp via background task                           │
│    → Cria conta do cliente (se solicitado)                        │
└────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Edge Function: `create-asaas-pix/index.ts`

**Mover WhatsApp para background task:**

```typescript
// ANTES (bloqueante):
await fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {...});
console.log('WhatsApp notification sent');

// DEPOIS (background - não bloqueia):
EdgeRuntime.waitUntil(
  fetch(`${supabaseUrl}/functions/v1/send-order-whatsapp`, {...})
    .then(() => console.log('WhatsApp sent in background'))
    .catch(err => console.error('Background WhatsApp error:', err))
);
```

**Retornar mais cedo:**

```typescript
// Retorna resposta ANTES de atualizar DB e enviar WhatsApp
// Essas operações vão para background
```

---

### 2. Frontend: `CartDrawer.tsx`

**Remover etapas duplicadas antes de chamar PIX:**

O fluxo atual no frontend faz:
1. `handleConfirmOrder` → cria pedido + envia email
2. Usuário clica PIX → `handlePixPayment`

Mas a edge function **já cria o pedido**! Então o frontend cria 2 vezes.

**Simplificar para:**
- Ir direto para `handlePixPayment` sem criar pedido antes
- A edge function já cuida de tudo
- Email de confirmação será enviado pelo webhook quando pagamento for aprovado

---

### 3. Remover Email de Confirmação Prematuro

Atualmente envia email **antes** do pagamento. Isso:
- Atrasa o checkout em ~1-2 segundos
- Confunde o cliente (recebe email mas não pagou ainda)

**Mover para:** Enviar email apenas quando pagamento for aprovado (já funciona via webhook).

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/create-asaas-pix/index.ts` | WhatsApp e atualização DB em background via `EdgeRuntime.waitUntil` |
| `src/components/CartDrawer.tsx` | Remover criação de pedido duplicada + email prematuro |

---

## Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo até ver QR Code | 3-5 segundos | 1-1.5 segundos |
| Email de confirmação | Antes do pagamento | Após pagamento (via webhook) |
| WhatsApp | Bloqueia UI | Background (não bloqueia) |

---

## Fluxo Simplificado Final

```text
Cliente clica "Pagar via PIX"
        ↓
Edge function create-asaas-pix:
  → Busca/cria cliente Asaas (~400ms)
  → Cria cobrança PIX (~400ms)  
  → Busca QR Code (~300ms)
  → Retorna QR Code para frontend
        ↓
QR Code aparece na tela (~1 segundo total)
        ↓
(Background: salva dados, envia WhatsApp)
        ↓
Cliente paga
        ↓
Webhook confirma → envia email de sucesso
```
