

# Adicionar Precos e Selecao Fit/Fitness ao Monte Seu Cardapio

## Resumo

Adicionar ao formulario de cardapio personalizado:
1. Selecao entre **Fit (300g)** e **Fitness (450g)** com composicao diferente
2. Exibicao do preco unitario e total baseado nos pacotes reais do banco de dados
3. Ajuste da mensagem do WhatsApp para incluir linha e valor

## Detalhes da mudanca

### Composicao por linha
- **Fit (300g)**: 100g proteina + 150g carboidrato + 50g mix
- **Fitness (450g)**: 150g proteina + 200g carboidrato + 100g mix

### Precos (do banco de dados - tabela `marmita_packages`)
Os pacotes reais sao 7, 14, 21 e 28 unidades. As quantidades do formulario (10, 20, 30) nao correspondem exatamente. A proposta e:
- Trocar as opcoes de quantidade para usar os pacotes reais do banco (7, 14, 21, 28)
- Buscar os precos direto da tabela `marmita_packages` ao carregar a pagina
- Exibir o preco unitario e o total no card de cada opcao

### Precos atuais no banco

| Qtd | Fit (un.) | Fit (total) | Fitness (un.) | Fitness (total) |
|-----|-----------|-------------|---------------|-----------------|
| 7   | R$ 26,90  | R$ 188,30   | R$ 31,90      | R$ 223,30       |
| 14  | R$ 24,90  | R$ 348,60   | R$ 29,90      | R$ 418,60       |
| 21  | R$ 23,90  | R$ 501,90   | R$ 27,90      | R$ 585,90       |
| 28  | R$ 22,90  | R$ 641,20   | R$ 26,90      | R$ 753,20       |

### Regra de sabores (mantida)
- 7 unidades: ate 3 sabores
- 14 unidades: ate 5 sabores
- 21 unidades: ate 7 sabores
- 28 unidades: ate 10 sabores

## Mudancas no formulario

1. **Novo seletor de linha** (antes da quantidade): dois botoes "Fit 300g" e "Fitness 450g" com icones e descricao da composicao
2. **Cards de quantidade** atualizados: mostram preco unitario e total, vindos do banco
3. **Resultado** exibe a composicao correta (Fit ou Fitness)
4. **Mensagem WhatsApp** inclui a linha escolhida e o valor total

## Mudancas na edge function

Atualizar o prompt do `generate-meal-plan` para receber o parametro `lineType` e ajustar os pesos conforme a linha:
- Fit: 100g proteina, 150g carb, 50g mix
- Fitness: 150g proteina, 200g carb, 100g mix

## Arquivos afetados

1. **`src/pages/MonteSeuCardapio.tsx`** - Adicionar selecao de linha, buscar precos do banco, exibir valores, atualizar mensagem WhatsApp
2. **`supabase/functions/generate-meal-plan/index.ts`** - Receber `lineType` e ajustar composicao no prompt

## Detalhes tecnicos

### Busca de precos
- Usar `useQuery` com `supabase.from('marmita_packages').select('quantity, unit_price, line_type, weight').eq('active', true)` ao montar a pagina
- Agrupar por `line_type` para popular os cards de quantidade com preco

### Estado adicional
- `selectedLine`: `'fit' | 'fitness'` (default: `'fit'`)
- Ao trocar a linha, atualizar os precos exibidos nos cards de quantidade

### Calculo do total
- `total = selectedQuantity * unitPrice` (do pacote correspondente)
- Exibir no resumo antes do botao WhatsApp

### Mensagem WhatsApp atualizada
Incluir a linha (Fit 300g ou Fitness 450g) e o valor total estimado na mensagem
