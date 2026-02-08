

## Campo de valor manual + contagem total de marmitas

### Mudanca 1 - Campo para digitar o valor total manualmente

Atualmente o valor total e calculado automaticamente (subtotal = soma dos precos dos itens). Quando o pedido vem via WhatsApp sem preco, fica R$ 0,00 e aparece como campo faltante.

**Arquivo:** `src/components/admin/WhatsAppOrderImporter.tsx`

- Adicionar um novo estado `manualSubtotal` (string) para o campo editavel
- Trocar a area "Valor total" (linhas 716-722) por um Input editavel com label "Valor total *"
- O `subtotal` usado no restante do fluxo passa a ser o valor do input manual (parseFloat) se preenchido, ou o calculado automaticamente como fallback
- O campo tera borda vermelha quando vazio/zero (isMissing('subtotal'))

### Mudanca 2 - Contagem total de marmitas no resumo e no modal de confirmacao

**Arquivo:** `src/components/admin/WhatsAppOrderImporter.tsx`

- Na secao "Itens *" (linha 630), ao lado do titulo, exibir um Badge com o total de marmitas: `{totalMarmitas} marmita(s)`
- `totalMarmitas = items.reduce((sum, i) => sum + i.quantity, 0)`

**Arquivo:** `src/components/admin/OrderConfirmationModal.tsx`

- No cabecalho do modal, exibir o total de marmitas: somar as quantidades de todos os `editableItems`
- Exibir como Badge ao lado do titulo, ex: "18 marmitas"

### Mudanca 3 - Valor editavel tambem no modal de confirmacao

**Arquivo:** `src/components/admin/OrderConfirmationModal.tsx`

- Trocar o campo "Valor" no resumo por um Input editavel para que o admin possa corrigir o valor antes de confirmar
- Adicionar estado local `editableSubtotal` inicializado com o `subtotal` da prop
- Adicionar callback `onSubtotalChanged` na interface para devolver o novo valor ao pai

**Arquivo:** `src/components/admin/WhatsAppOrderImporter.tsx`

- Passar o callback `onSubtotalChanged` para o OrderConfirmationModal e atualizar o `manualSubtotal` quando o valor mudar no modal

### Resumo tecnico

| Arquivo | Mudanca |
|---|---|
| WhatsAppOrderImporter.tsx | Estado `manualSubtotal`, Input editavel para valor, Badge com total de marmitas na secao Itens |
| OrderConfirmationModal.tsx | Badge com total de marmitas no cabecalho, Input editavel para valor no resumo, callback onSubtotalChanged |
