

# Impressao Termica - Texto em Negrito

## Problema
A impressao na termica i9 sai com texto fraco/claro, dificultando a leitura pela cozinha.

## Solucao
Adicionar `font-weight: bold` no `body` do HTML gerado em `src/lib/thermal-print.ts`, fazendo com que **todo** o texto do ticket saia em negrito por padrao. Tambem aumentar levemente o tamanho dos textos de ingredientes (de 11px para 12px) e dos totais para melhor legibilidade.

## Alteracoes

**Arquivo: `src/lib/thermal-print.ts`**

1. No CSS do `body`, adicionar `font-weight: bold`
2. Aumentar o font-size dos ingredientes de 11px para 12px
3. Garantir que textos secundarios (data, telefone) tambem fiquem em negrito via heranca

Mudanca simples e pontual, apenas no bloco de estilos CSS inline do HTML gerado.

