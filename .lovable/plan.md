
# Plano: Adicionar Campo CPF Obrigatório para PIX

## Problema Identificado

O Asaas agora **exige CPF/CNPJ para criar cobranças PIX**. Clientes antigos cadastrados sem CPF (como Bianca Gomes - `cus_000159400711`) estão recebendo erro:

```
"Para criar esta cobrança é necessário preencher o CPF ou CNPJ do cliente."
```

---

## Solução

Adicionar campo CPF **obrigatório** no checkout quando PIX for selecionado.

### Visual do Formulário

```text
┌─────────────────────────────────────────┐
│ Nome completo                           │
│ [________________________]              │
│                                         │
│ Email                                   │
│ [________________________]              │
│                                         │
│ WhatsApp                                │
│ [________________________]              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Forma de pagamento                  │ │
│ │ [PIX ✓]  [WhatsApp]                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ CPF (exigido pelo PIX)       👈 NOVO    │
│ [___.___.___-__]                        │
│                                         │
│ [         Gerar PIX         ]           │
└─────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Arquivo: `src/components/CheckoutForm.tsx`

**1. Atualizar schema Zod para validar CPF quando PIX:**

```typescript
const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  cpf: z.string().optional(),
  deliveryOption: z.enum(["pickup", "delivery"]),
  address: z.string().optional(),
  saveData: z.boolean().optional(),
});
```
> CPF permanece opcional no schema, validação real é feita antes do submit PIX

**2. Adicionar campo CPF visível quando PIX selecionado:**

```tsx
{paymentMethod === "pix" && (
  <div>
    <Label htmlFor="cpf" className="text-sm font-medium">
      CPF <span className="text-muted-foreground">(exigido pelo PIX)</span>
    </Label>
    <Controller
      name="cpf"
      control={control}
      render={({ field }) => (
        <Input
          id="cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={formatCPF(field.value || '')}
          onChange={(e) => field.onChange(formatCPF(e.target.value))}
          className="mt-1"
        />
      )}
    />
    {cpfError && (
      <p className="text-xs text-destructive mt-1">{cpfError}</p>
    )}
  </div>
)}
```

**3. Validar CPF antes de gerar PIX:**

```typescript
const [cpfError, setCpfError] = useState<string | null>(null);

const handlePixPayment = async (data: FormData) => {
  // Validar CPF obrigatório para PIX
  const cpfValue = data.cpf?.replace(/\D/g, '') || '';
  
  if (!cpfValue || cpfValue.length !== 11) {
    setCpfError('CPF é obrigatório para pagamento PIX');
    return;
  }
  
  if (!validateCPF(cpfValue)) {
    setCpfError('CPF inválido. Verifique os números.');
    return;
  }
  
  setCpfError(null);
  // ... resto do código de pagamento
};
```

### Arquivo: `supabase/functions/create-asaas-pix/index.ts`

**4. Garantir atualização do CPF em cliente existente:**

```typescript
// Se encontrou cliente existente no Asaas, atualizar CPF
if (asaasCustomerId && cleanCpf.length === 11) {
  console.log('Updating existing Asaas customer with CPF...');
  await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
    method: 'PUT',
    headers: {
      'access_token': asaasApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cpfCnpj: cleanCpf }),
  });
}
```

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `CheckoutForm.tsx` | Adicionar campo CPF visível quando PIX selecionado |
| `CheckoutForm.tsx` | Validação obrigatória do CPF antes do submit |
| `CheckoutForm.tsx` | Estado `cpfError` para exibir erro de validação |
| `create-asaas-pix/index.ts` | Forçar atualização de CPF em clientes existentes |

---

## Fluxo do Cliente

1. Cliente preenche dados (nome, email, WhatsApp)
2. Seleciona **PIX** como forma de pagamento
3. Campo CPF aparece com máscara automática
4. Ao clicar "Gerar PIX":
   - Sistema valida CPF (11 dígitos + algoritmo)
   - Se inválido → mostra erro no campo
   - Se válido → atualiza cliente no Asaas e gera QR Code

---

## Resultado Esperado

- Bianca Gomes conseguirá pagar informando seu CPF
- Novos clientes sempre terão CPF cadastrado
- Clientes antigos terão CPF atualizado automaticamente
- WhatsApp continua funcionando **sem exigir CPF**
