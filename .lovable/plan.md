

# Plano: Remover Dependência de Domínio para PIX Funcionar

## Problema Atual

O Asaas está rejeitando a criação de cobranças PIX porque o campo `callback.successUrl` usa um domínio que não está cadastrado na sua conta Asaas. Você tem múltiplos domínios, o que complica ainda mais.

## Solução Recomendada

**Remover o campo `callback` da requisição de pagamento.** Isso elimina a validação de domínio e o PIX funciona imediatamente em qualquer domínio.

### Por que isso funciona?

O callback é **opcional** - é apenas um redirect automático após o pagamento. Seu sistema já tem:
- ✅ **Webhook configurado** - recebe confirmação do Asaas automaticamente
- ✅ **Polling na página PIX** - verifica status a cada poucos segundos
- ✅ **Redirect automático** - quando detecta pagamento aprovado, redireciona para sucesso

---

## Alterações Técnicas

### Arquivo: `supabase/functions/create-asaas-pix/index.ts`

**Linha 306-316 - Remover o campo `callback`:**

```typescript
// DE:
const paymentPayload = {
  customer: asaasCustomerId,
  billingType: 'PIX',
  value: transactionAmount,
  dueDate: dueDateStr,
  description: `Pedido Dieta Já - ${items.length} item(s)`,
  externalReference: orderId,
  callback: {
    successUrl: `${siteUrl}/pagamento/sucesso?order_id=${orderId}`,
  },
};

// PARA:
const paymentPayload = {
  customer: asaasCustomerId,
  billingType: 'PIX',
  value: transactionAmount,
  dueDate: dueDateStr,
  description: `Pedido Dieta Já - ${items.length} item(s)`,
  externalReference: orderId,
  // Callback removido - redirect feito via polling no frontend
};
```

**Também remover a linha 304 (variável não utilizada):**
```typescript
// REMOVER:
const siteUrl = 'https://dietajavca.com.br';
```

---

## Fluxo Após a Correção

```text
1. Cliente clica "Pagar via PIX"
        ↓
2. Edge function cria cobrança (sem callback)
        ↓
3. QR Code é exibido na tela
        ↓
4. Cliente paga no app do banco
        ↓
5. Asaas envia confirmação via webhook
        ↓
6. Frontend detecta via polling e redireciona
        ↓
7. Página de sucesso é exibida
```

---

## Vantagens Desta Solução

| Aspecto | Benefício |
|---------|-----------|
| **Funciona imediatamente** | Não precisa configurar nada no Asaas |
| **Multi-domínio** | Funciona em qualquer domínio (preview, produção, customizado) |
| **Seguro** | Webhook já está configurado corretamente |
| **UX preservada** | Polling detecta pagamento em 2-5 segundos |

---

## Opcional: Cadastrar Domínio Depois

Se quiser ter o redirect automático pelo Asaas (além do polling), você pode cadastrar o domínio principal no futuro:

1. Acesse https://www.asaas.com
2. Vá em **Minha Conta** > **Informações** ou **Dados do Site**
3. Cadastre: `https://dietajavca.com.br`
4. Depois disso, posso reativar o callback no código

Mas isso é **opcional** - a solução funciona perfeitamente sem.

