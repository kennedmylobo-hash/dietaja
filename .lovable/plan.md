
# Plano: Prevenir Pedidos Duplicados e Corrigir Validação de CPF

## Problema Identificado

A cliente Claudia clicou 8 vezes no botão "Pagar via PIX" em 24 segundos. Cada clique:
1. Criou um pedido novo no banco de dados
2. Tentou criar cliente no Asaas com CPF `00000000000`
3. Asaas rejeitou por CPF inválido
4. Erro foi exibido, cliente clicou novamente

**Resultado:** 8 pedidos "orfãos" com status `pending` e nenhum PIX gerado.

---

## Solução em 3 Partes

### Parte 1: Proteção contra Cliques Múltiplos (Frontend)

**Arquivo:** `src/components/CheckoutForm.tsx`

Adicionar um estado de "processando" mais robusto que:
- Desabilite o botão imediatamente ao primeiro clique
- Use `useRef` para prevenir reentrada
- Mostre feedback visual mais claro durante processamento

```tsx
// Adicionar ref para controle de submissão
const isSubmitting = useRef(false);

const handlePixPayment = async (data: FormData) => {
  // Prevenir duplo clique
  if (isSubmitting.current || isLoading) return;
  isSubmitting.current = true;
  setIsLoading(true);
  
  try {
    // ... resto do código
  } finally {
    setIsLoading(false);
    isSubmitting.current = false;
  }
};
```

---

### Parte 2: Reutilizar Pedido Existente (Backend)

**Arquivo:** `supabase/functions/create-asaas-pix/index.ts`

Antes de criar um novo pedido, verificar se já existe um pedido recente (últimos 5 minutos) do mesmo cliente com status `pending`:

```typescript
// Verificar se já existe pedido recente deste cliente
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id, order_number')
  .eq('customer_email', customer.email)
  .eq('status', 'pending')
  .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (existingOrder) {
  console.log('Reusing existing order:', existingOrder.id);
  orderId = existingOrder.id;
} else {
  // Criar novo pedido
}
```

---

### Parte 3: Melhorar Validação de CPF (Frontend + Backend)

**Problema:** O CPF está chegando como `00000000000` no backend.

**Causa provável:** A validação do form só ocorre no submit, mas o CPF pode estar mal formatado ou o campo não foi preenchido.

**Solução no Backend:**
```typescript
// Validar CPF antes de tentar criar cliente
if (!customer.cpf || customer.cpf.replace(/\D/g, '').length !== 11) {
  throw new Error('CPF inválido. Por favor, preencha corretamente.');
}

const customerCpf = customer.cpf.replace(/\D/g, '');
// Remover o fallback para zeros
```

**Solução no Frontend:**
Já existe validação no form, mas precisamos garantir que o erro seja mais visível quando o CPF for inválido.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/CheckoutForm.tsx` | Adicionar `useRef` para prevenir duplo clique + feedback visual mais claro |
| `supabase/functions/create-asaas-pix/index.ts` | Reutilizar pedido pendente recente do mesmo cliente + validação de CPF antes de chamar Asaas |

---

## Fluxo Corrigido

```text
Cliente clica "Pagar via PIX"
       │
       ▼
  [Botão desabilitado imediatamente]
       │
       ▼
  [Backend verifica pedido pendente recente]
       │
   ┌───┴───┐
   │       │
Existe?  Não existe?
   │       │
Reutiliza  Cria novo
   │       │
   └───┬───┘
       │
       ▼
  [Valida CPF ≠ zeros]
       │
   ┌───┴───┐
   │       │
Válido?  Inválido?
   │       │
Continua  Retorna erro claro
   │       
   ▼       
[Cria PIX no Asaas]
       │
       ▼
[Exibe QR Code]
```

---

## Impacto

- Evita criação de pedidos duplicados
- Melhora UX com feedback mais rápido
- Mensagem de erro mais clara quando CPF é inválido
- Reduz carga no banco de dados e API do Asaas

---

## Seção Técnica

### Alterações no Frontend (`CheckoutForm.tsx`)

1. Importar `useRef`:
```tsx
import { useState, useEffect, useCallback, useRef } from "react";
```

2. Criar ref:
```tsx
const isSubmittingRef = useRef(false);
```

3. Modificar `handlePixPayment`:
```tsx
const handlePixPayment = async (data: FormData) => {
  if (isSubmittingRef.current || isLoading) {
    console.log('Already submitting, ignoring click');
    return;
  }
  isSubmittingRef.current = true;
  setIsLoading(true);
  // ... resto do código existente ...
  // No finally:
  isSubmittingRef.current = false;
  setIsLoading(false);
};
```

### Alterações no Backend (`create-asaas-pix/index.ts`)

1. Antes de criar pedido, buscar existente:
```typescript
// Verificar pedido duplicado
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id, order_number')
  .eq('customer_email', customer.email)
  .in('status', ['pending', 'pix_failed'])
  .gte('created_at', fiveMinutesAgo)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (existingOrder && !order_id) {
  orderId = existingOrder.id;
  console.log('Reusing existing pending order:', orderId);
}
```

2. Validar CPF antes de Asaas:
```typescript
const cleanCpf = customer.cpf?.replace(/\D/g, '') || '';
if (cleanCpf.length !== 11 || cleanCpf === '00000000000') {
  throw new Error('CPF inválido. Verifique os 11 dígitos.');
}
```
