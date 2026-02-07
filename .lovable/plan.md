

## Correção: Sabores Duplicados + Peso no Cardápio

### O que sera feito

1. **Limpar pacotes duplicados no banco** - Existem 16 registros ativos quando deveriam ser 8 (4 quantidades x 2 linhas). Vamos desativar os duplicados.

2. **Corrigir agrupamento no cardápio** - Hoje o codigo coloca TODOS os pacotes de marmita em TODAS as categorias (carnes, frangos, massas...). O correto e agrupar por linha: "Marmitas Fit (300g)" e "Marmitas Fitness (450g)".

3. **Exibir o peso no card do produto** - Fit = 300g, Fitness = 450g. Badge visual no card.

4. **Passar o peso correto ao modal de sabores** - O modal ja aceita `packageWeight`, mas o Cardapio nao esta enviando. Vamos passar com base no `line_type`.

---

### Detalhes Tecnicos

**Migration SQL**: Desativar (`active = false`) os duplicados, mantendo apenas 1 registro por combinacao `(line_type, quantity)` -- o de menor `id` lexicografico.

**src/pages/Cardapio.tsx**:
- Substituir o agrupamento por categorias de sabor (`carnes`, `frangos`, `massas`) por agrupamento por linha (`fit`, `fitness`)
- Criar duas secoes fixas com nomes descritivos: "Marmitas Fit - Emagrecimento (300g)" e "Marmitas FITNESS - Hipertrofia (450g)"
- Passar `weight` no objeto do produto
- Passar `packageWeight` ao `FlavorSelectionModal` baseado no `lineType` do produto (300 para emagrecimento, 450 para hipertrofia)
- Atualizar `PendingProduct` para incluir `weight`
- Atualizar sidebar/nav para refletir as duas categorias de linha em vez das categorias de sabor

**src/components/cardapio/ProductCard.tsx**:
- Adicionar prop `weight?: number`
- Exibir badge com peso (ex: "300g" ou "450g") proximo ao badge de tipo

**src/components/cardapio/CategorySection.tsx**:
- Propagar prop `weight` para `ProductCard`

**Menu Categories**: As categorias `carnes`, `frangos`, `massas`, `especiais` continuam existindo no banco para uso no modal de selecao de sabores. No cardapio, as secoes de marmita passam a ser agrupadas por linha (fit/fitness) em vez de por categoria de sabor.

