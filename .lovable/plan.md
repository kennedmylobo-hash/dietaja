
# Corrigir: Campo CPF obrigatorio no CartDrawer para PIX funcionar

## Problema Identificado

O cliente "cacetinho" tentou pagar via PIX pelo **CartDrawer** (carrinho lateral usado no Cardapio e landing pages). O CPF nao foi pedido porque o campo foi **removido intencionalmente** no CartDrawer com o comentario "CPF field removed - testing without it for better conversion" (linha 1267).

Porem, a API do Asaas **exige CPF** para gerar cobranças PIX. O resultado:

1. Cliente clica "Gerar PIX" sem CPF
2. Edge function envia CPF vazio ao Asaas
3. Asaas rejeita com erro `invalid_customer.cpfCnpj`
4. O sistema tenta automaticamente 3 vezes (retries silenciosos)
5. Apos todas as tentativas, mostra apenas "Ops! Tente novamente" -- sem pedir o CPF
6. Cliente clicou repetidamente (17 tentativas em 2 minutos), todas falharam

O **CheckoutForm** (pagina principal) tem o campo CPF implementado corretamente. O **CartDrawer** nao.

## Solucao

### 1. Restaurar campo CPF no CartDrawer
**Arquivo:** `src/components/CartDrawer.tsx`

- Remover o comentario "CPF field removed" (linha 1267)
- Adicionar campo de CPF visivel quando o metodo de pagamento for PIX
- Usar o mesmo padrao do CheckoutForm: campo com mascara `000.000.000-00`, inputMode numeric
- Validar CPF antes de chamar a edge function (se vazio ou invalido, mostrar erro inline)

### 2. Bloquear envio sem CPF valido
**Arquivo:** `src/components/CartDrawer.tsx`

Na funcao `handlePixPayment`:
- Remover o comentario "CPF is optional now" (linha 478)
- Adicionar validacao: se CPF vazio ou invalido, setar `cpfError` e retornar sem chamar a API
- Usar a mesma funcao `validateCPF` do `src/lib/cpf.ts` (algoritmo completo com digitos verificadores) em vez da validacao simplificada local

### 3. Melhorar feedback de erro
**Arquivo:** `src/components/CartDrawer.tsx`

Apos os retries falharem, verificar se o erro e de CPF e mostrar mensagem especifica:
- "CPF e obrigatorio para pagamento PIX. Preencha o campo acima."

## Detalhes Tecnicos

### Campo CPF no CartDrawer (onde inserir)
Antes do botao "Gerar PIX" (linha 1267), adicionar:

```typescript
{/* CPF - obrigatorio para PIX */}
<div className="space-y-1">
  <Label htmlFor="cpf-drawer" className="text-sm font-medium">
    CPF <span className="text-muted-foreground text-xs">(exigido pelo PIX)</span>
  </Label>
  <Input
    id="cpf-drawer"
    inputMode="numeric"
    placeholder="000.000.000-00"
    value={formatCpf(cpfValue)}
    onChange={(e) => {
      setCpfValue(formatCpf(e.target.value));
      setCpfError("");
    }}
    className={cpfError ? 'border-destructive' : ''}
  />
  {cpfError && <p className="text-xs text-destructive">{cpfError}</p>}
</div>
```

### Validacao no handlePixPayment
```typescript
const handlePixPayment = async (retryCount = 0) => {
  if (!formData) return;
  
  const cleanedCpf = cpfValue.replace(/\D/g, '');
  
  // CPF e obrigatorio para PIX
  if (!cleanedCpf || cleanedCpf.length !== 11) {
    setCpfError('CPF e obrigatorio para pagamento PIX');
    return;
  }
  
  if (!validateCPF(cleanedCpf)) {
    setCpfError('CPF invalido. Verifique os numeros.');
    return;
  }
  
  setCpfError("");
  // ... resto da logica
};
```

### Import necessario
```typescript
import { validateCPF, formatCPF } from "@/lib/cpf";
```
E remover as funcoes locais `formatCpf` e `validateCpf` duplicadas (linhas 460-472).

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/CartDrawer.tsx` | Restaurar campo CPF, validacao obrigatoria, importar de `lib/cpf` |

## Resultado esperado
- Cliente ve campo CPF ao selecionar PIX no CartDrawer
- Se nao preencher, ve erro claro "CPF e obrigatorio"
- CPF validado com algoritmo completo antes de enviar
- PIX gerado com sucesso na primeira tentativa
