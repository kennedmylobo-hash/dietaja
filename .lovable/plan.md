
# Corrigir nomes genéricos "Proteína" nos escondidinhos

## Problema
Os 5 escondidinhos no banco de dados estão com o nome genérico "Proteína" no campo `sides`, ao inves do nome real da proteina do prato. Isso aparece no cardapio do cliente como "175g Proteina" e tambem sairia assim na impressao para a cozinha.

## O que sera feito
Atualizar o campo `sides` (JSONB) dos 5 escondidinhos para trocar "Proteina" pelo nome correto:

| Sabor | Antes | Depois |
|-------|-------|--------|
| Escondidinho de carne bovina com pure de aipim | Proteina | Carne bovina |
| Escondidinho de carne bovina com pure de batata doce | Proteina | Carne bovina |
| Escondidinho de carne bovina com pure de abobora | Proteina | Carne bovina |
| Escondidinho de frango com pure de aipim | Proteina | Frango |
| Escondidinho de frango com pure de batata doce | Proteina | Frango |

## Resultado esperado
- **Cliente**: Vera "120g Carne bovina + 180g Pure de aipim" (Fit) ou "175g Carne bovina + 275g Pure de aipim" (Fitness)
- **Cozinha/Producao**: A impressao do pedido ja usa esses mesmos dados, entao vai sair com o peso certinho de cada ingrediente por sabor e por linha (Fit ou Fitness)

## Secao Tecnica

5 updates SQL no campo `sides` da tabela `marmita_flavors`:

- `ee4d579a` (Esc. carne bovina + aipim): "Proteina" -> "Carne bovina" em fit e fitness
- `9a9d91af` (Esc. carne bovina + batata doce): "Proteina" -> "Carne bovina"
- `403cb1f4` (Esc. carne bovina + abobora): "Proteina" -> "Carne bovina"
- `45f4a930` (Esc. frango + aipim): "Proteina" -> "Frango"
- `b8de8055` (Esc. frango + batata doce): "Proteina" -> "Frango"

Nenhum arquivo de codigo precisa ser alterado — apenas dados no banco.
