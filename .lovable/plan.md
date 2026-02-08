

## Rolagem e total de marmitas no modal de detalhes do pedido

### Problema 1 - Conteudo cortado
O modal de detalhes do pedido usa `max-h-[85vh]` com `ScrollArea`, mas o conteudo esta sendo cortado nos ultimos itens. Precisa garantir que a area de rolagem funcione corretamente com padding inferior suficiente.

### Problema 2 - Total de marmitas nao aparece
O titulo "Itens" nao mostra a contagem total de marmitas do pedido.

### Mudancas

**Arquivo:** `src/components/admin/OrdersManager.tsx`

1. **Linha 1476** - Adicionar Badge com total de marmitas ao lado do titulo "Itens":
   ```
   Itens  [18 marmitas]
   ```
   Calculo: `selectedOrder.items.reduce((sum, i) => sum + (i.quantity || 1), 0)`

2. **Linha 1414** - Ajustar o `DialogContent` para melhorar a rolagem: trocar `max-h-[85vh]` por `max-h-[90vh]` e adicionar `pb-4` ao conteudo interno do `ScrollArea` para que o ultimo item nao fique cortado.

| Arquivo | Mudanca |
|---|---|
| OrdersManager.tsx | Linha 1476: Badge com total de marmitas | 
| OrdersManager.tsx | Linha 1414: melhorar altura maxima e padding do scroll |
