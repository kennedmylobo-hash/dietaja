

## Corrigir Scroll no Modal de Detalhes do Pedido

### Problema
A correcao anterior (`min-h-0`) nao foi suficiente. O `ScrollArea` do Radix UI depende de calculos internos de altura que nao funcionam bem em containers flex sem altura explicita. O viewport interno do Radix continua sem ativar o scroll.

### Solucao
Substituir o `ScrollArea` do Radix por um `div` com `overflow-y-auto` nativo, que funciona de forma confiavel em containers flex.

**Arquivo:** `src/components/admin/OrdersManager.tsx`

1. **Linha 1425**: Trocar `<ScrollArea className="flex-1 min-h-0 pr-4">` por `<div className="flex-1 min-h-0 overflow-y-auto pr-4">`

2. **Linha 1769**: Trocar `</ScrollArea>` por `</div>`

### Por que essa abordagem
O componente `ScrollArea` do Radix usa um viewport interno com calculos de altura que conflitam com layouts flex dinamicos. O `overflow-y-auto` nativo do CSS funciona perfeitamente com `flex-1` + `min-h-0`, ativando o scroll automaticamente quando o conteudo excede o espaco disponivel.

### Resultado Esperado
O modal tera scroll nativo funcional, permitindo rolar ate o final e acessar todos os botoes (Producao, WhatsApp, Cancelar, etc.).
