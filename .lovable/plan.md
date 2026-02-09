

# Precos Individuais por Produto + Custo nos Pedidos do Site

## Problema 1: Precos individuais no orcamento de dieta

Atualmente, o sistema calcula o preco de cada item automaticamente com base no peso das categorias (proteina, carboidrato, legumes) e uma margem fixa. Mas cada refeicao tem ingredientes diferentes e custos diferentes -- nao da pra usar o mesmo preco pra tudo.

### Solucao

Tornar o campo "Preco fixo" mais intuitivo na tabela de itens do orcamento:

- Mostrar o preco calculado automaticamente como sugestao
- Permitir clicar no preco para editar diretamente (inline)
- Ao editar, o valor digitado vira o preco final daquele item
- Botao para "resetar" ao preco calculado se quiser voltar ao automatico
- Coluna mais visivel e com melhor UX (campo clicavel em vez de input separado)

Assim, apos o parser extrair os itens, o admin pode ajustar o preco de cada um individualmente com um clique.

## Problema 2: Custo dos pedidos do site

Os pedidos feitos pelo site ja tem toda a informacao necessaria para calcular o custo:
- Sabores escolhidos (com composicao de ingredientes cadastrada)
- Quantidade de cada sabor
- Pesos por ingrediente (proteina, carbo, legumes)

Usando a mesma tabela de insumos (tenant_diet_pricing), podemos calcular o custo estimado de cada pedido automaticamente.

### Solucao

Adicionar um resumo financeiro no painel de pedidos (OrdersManager) e no KPI Dashboard:

**No detalhe de cada pedido:**
- Mostrar "Custo estimado" ao lado do valor de venda
- Mostrar margem de lucro real do pedido
- Usar os pesos dos ingredientes (do cadastro de sabores `marmita_flavors.sides`) + custos da tabela de insumos

**No KPI Dashboard:**
- Card novo: "Lucro estimado" (receita - custo estimado)
- Margem media dos pedidos

## Detalhes tecnicos

### Alteracoes na calculadora de dieta (`CustomDietQuoter.tsx`)

1. Substituir o campo "Preco fixo" por um campo de preco editavel inline mais intuitivo
2. Mostrar o preco calculado como placeholder/sugestao
3. Ao digitar um valor, ele se torna o `priceOverride`
4. Botao de "reset" (X) para voltar ao preco automatico
5. Destaque visual quando o preco foi editado manualmente (badge ou cor diferente)

### Novo hook: `useOrderCostCalculator.ts`

Reutiliza a logica de `useDietPricing` para calcular o custo de qualquer pedido do site:

```text
Para cada sabor do pedido:
  1. Buscar composicao do sabor (marmita_flavors.sides)
  2. Separar proteina, carbo e legumes com seus pesos
  3. Aplicar custos da tenant_diet_pricing (custo/kg + fator de coccao)
  4. Somar embalagem + custo fixo
  5. Total = soma de todos os sabores * quantidade
```

### Alteracoes no OrdersManager

- No card de detalhe do pedido, adicionar linha "Custo estimado: R$ XX,XX"
- Mostrar "Margem: XX%" ao lado
- Usar cores (verde para margem boa, amarelo para apertada, vermelho para prejuizo)

### Alteracoes no KPI Dashboard

- Novo card: "Lucro Estimado" com o total de (receita - custo) dos pedidos aprovados
- Tooltip explicando que e uma estimativa baseada na tabela de insumos

### Arquivos alterados

| Arquivo | O que muda |
|---|---|
| `src/components/admin/CustomDietQuoter.tsx` | Campo de preco editavel inline com melhor UX |
| `src/hooks/useOrderCostCalculator.ts` | Novo hook para calcular custo de qualquer pedido |
| `src/components/admin/OrdersManager.tsx` | Exibir custo e margem no detalhe do pedido |
| `src/components/admin/KPIDashboard.tsx` | Card de lucro estimado |

Nenhuma migracao de banco necessaria -- tudo ja existe, so precisa conectar os dados.

