

# Validacao de CPF obrigatoria no checkout PIX

## Problema
O campo CPF so aparece quando PIX e selecionado, mas a validacao acontece apenas no momento do clique em "Gerar PIX" (validacao imperativa). Isso permite que CPFs invalidos cheguem ao Asaas, causando erros como o do Kennedy.

## O que sera feito

### 1. Validacao no formulario (frontend)
- Mover a validacao de CPF para o schema Zod, com validacao condicional: quando o metodo de pagamento for PIX, o CPF sera obrigatorio e validado pelo algoritmo oficial
- O campo CPF mostrara erro inline em tempo real (ao sair do campo), nao apenas ao clicar em "Gerar PIX"
- Remover o estado manual `cpfError` e usar os erros do react-hook-form

### 2. Validacao na edge function (backend)
- Adicionar validacao de CPF na edge function `create-asaas-pix` antes de enviar ao Asaas
- Se o CPF for invalido ou ausente, retornar erro 400 imediatamente, sem criar pedido nem chamar a API do Asaas

## Detalhes Tecnicos

### CheckoutForm.tsx
- Atualizar o schema Zod para incluir `paymentMethod` e usar `.superRefine()` para exigir CPF valido quando `paymentMethod === "pix"`
- Adicionar `paymentMethod` ao formulario via `setValue` quando o usuario selecionar
- O campo CPF continuara aparecendo apenas quando PIX for selecionado, mas agora com validacao integrada ao react-hook-form
- Remover o estado `cpfError` e a validacao manual dentro de `handlePixPayment`

### create-asaas-pix/index.ts
- Adicionar checagem no inicio: se `customer.cpf` estiver ausente ou falhar na validacao de digito verificador, retornar `{ success: false, error: "CPF invalido" }` com status 400
- Reutilizar o mesmo algoritmo de validacao que existe em `src/lib/cpf.ts`

### Arquivos afetados
1. `src/components/CheckoutForm.tsx` -- schema Zod + remocao de validacao manual
2. `supabase/functions/create-asaas-pix/index.ts` -- validacao server-side

