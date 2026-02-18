

# Remover Chips de Ingredientes da Interface do Cliente

## Resumo

Remover os chips/badges de ingredientes clicaveis que aparecem abaixo dos campos de texto na pagina "Monte Seu Cardapio". A filtragem de ingredientes continua funcionando no backend (edge functions), mas o cliente nao vera a lista de ingredientes disponiveis na tela.

## O que sera removido

- A query `useQuery` que busca `marmita_flavors` e `marmita_sides` para exibir os chips
- A funcao `handleChipClick` que adicionava ingredientes ao clicar
- A funcao `renderChips` que renderizava os badges
- As 3 chamadas `renderChips()` abaixo dos campos de proteinas, carboidratos e mix
- O import do `Badge` (se nao for usado em outro lugar do arquivo)

## O que permanece intacto

- Filtragem de ingredientes no backend (edge functions `parse-voice-preferences` e `generate-meal-plan`)
- Cache de ingredientes nas edge functions
- Todos os outros elementos da pagina (formulario, audio, resultados, botoes)

## Arquivo afetado

`src/pages/MonteSeuCardapio.tsx` -- remover codigo dos chips e a query associada
