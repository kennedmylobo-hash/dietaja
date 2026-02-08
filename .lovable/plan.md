

## Corrigir Scroll no Modal de Detalhes do Pedido

### Problema
O modal de detalhes do pedido usa `ScrollArea` com `flex-1`, mas o componente do Radix ScrollArea precisa de uma altura explicitamente definida para funcionar corretamente. Atualmente o conteudo transborda sem scroll visivel.

### Solucao
Alterar o `ScrollArea` dentro do modal para ter uma altura minima definida e garantir que o overflow funcione:

**Arquivo:** `src/components/admin/OrdersManager.tsx`

1. Na linha 1425, alterar o `ScrollArea` de:
   ```
   <ScrollArea className="flex-1 pr-4">
   ```
   Para:
   ```
   <ScrollArea className="flex-1 min-h-0 pr-4">
   ```

2. Na linha 1416, alterar o `DialogContent` de:
   ```
   <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
   ```
   Para:
   ```
   <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
   ```

A chave do problema e o `min-h-0` no ScrollArea. Em containers flex, elementos filhos tem `min-height: auto` por padrao, o que impede o flex-shrink de funcionar. Adicionar `min-h-0` permite que o ScrollArea respeite o limite de altura do pai e ative o scroll interno.

### Resultado Esperado
O modal tera uma barra de rolagem funcional, permitindo acessar todos os botoes (Producao, WhatsApp, etc.) sem precisar selecionar texto para forcar o scroll.
