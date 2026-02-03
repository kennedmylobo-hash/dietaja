
# Plano: Corrigir Exibição de Erros de Pagamento

## Problema Identificado

A função `extractErrorDetails` no componente `PaymentErrorLogs.tsx` está procurando pelo formato de erro do **Mercado Pago** (`response.cause`), mas os erros atuais vêm do **Asaas** no formato `response.errors`.

**Formato do erro Asaas (atual):**
```json
{
  "errors": [
    {
      "code": "invalid_customer.cpfCnpj",
      "description": "Para criar esta cobrança é necessário preencher o CPF ou CNPJ do cliente."
    }
  ]
}
```

**Código atual (incorreto):**
```typescript
const cause = (response.cause as Array<...>) || [];
const firstCause = cause[0];
```

---

## Solução

Atualizar a função `extractErrorDetails` para suportar tanto o formato do Asaas quanto formatos legados.

---

## Alterações Técnicas

### Arquivo: `src/components/admin/PaymentErrorLogs.tsx`

**1. Corrigir função `extractErrorDetails`:**

```typescript
const extractErrorDetails = (log: PaymentErrorLog) => {
  const response = log.response_payload as Record<string, unknown> | null;
  if (!response) return null;

  // Formato Asaas: { errors: [{ code, description }] }
  const errors = response.errors as Array<{ code?: string; description?: string }> | undefined;
  if (errors && errors.length > 0) {
    return {
      code: errors[0]?.code,
      description: errors[0]?.description,
    };
  }

  // Formato Mercado Pago legado: { cause: [{ code, description }] }
  const cause = response.cause as Array<{ code?: string; description?: string }> | undefined;
  if (cause && cause.length > 0) {
    return {
      code: cause[0]?.code,
      description: cause[0]?.description,
    };
  }

  // Fallback para outros formatos
  return {
    code: response.error as string,
    description: response.message as string,
  };
};
```

**2. Atualizar título do modal (linha 194):**

De:
```tsx
<h4 className="font-medium mb-2">Resposta do Mercado Pago</h4>
```

Para:
```tsx
<h4 className="font-medium mb-2">Resposta do Gateway ({log.provider || 'Asaas'})</h4>
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| `Erro desconhecido` | `invalid_customer.cpfCnpj - Para criar esta cobrança é necessário preencher o CPF...` |
| "Resposta do Mercado Pago" | "Resposta do Gateway (Asaas)" |

---

## Resumo

| Alteração | Descrição |
|-----------|-----------|
| `extractErrorDetails` | Suportar formato `errors` do Asaas além de `cause` do MP |
| Título modal | Mostrar nome do provider dinâmicamente |

Os erros da Bianca Gomes passarão a mostrar corretamente: **"CPF/CNPJ obrigatório para cobrança PIX"**
