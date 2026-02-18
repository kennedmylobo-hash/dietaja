

# Guiar o Cliente ao Proximo Passo Apos Audio

## Resumo

Apos o audio preencher os campos automaticamente, o sistema vai:
1. Rolar a tela suavemente ate a secao "Qual linha deseja?" para o cliente ver o proximo passo
2. Mostrar um destaque visual temporario (pulso/brilho) na secao de linha e quantidade
3. Atualizar o toast de sucesso para incluir a instrucao do proximo passo

## O que muda

### No `src/pages/MonteSeuCardapio.tsx`

1. **Adicionar ref na secao de linha**: Um `useRef` na div da selecao de linha para poder rolar ate ela
2. **Scroll automatico apos preenchimento**: Apos o `setValue` dos 3 campos pelo audio, chamar `scrollIntoView` com comportamento suave para a secao de linha
3. **Destaque visual temporario**: Adicionar um estado `highlightNextStep` que ativa uma animacao de borda pulsando na secao de linha/quantidade por 3 segundos
4. **Toast atualizado**: Mudar a mensagem de sucesso de "Preferencias preenchidas! Confira e ajuste se quiser." para "Preferencias preenchidas! Agora escolha a linha e quantidade abaixo"

## Detalhes tecnicos

- Novo `useRef` para a secao de linha (`lineSectionRef`)
- Novo estado `highlightNextStep` (boolean, default false)
- Apos preencher os campos com sucesso no `parseTranscript`:
  - `setHighlightNextStep(true)`
  - `setTimeout` de 300ms para `scrollIntoView({ behavior: "smooth", block: "center" })`
  - `setTimeout` de 4000ms para `setHighlightNextStep(false)`
- Classe condicional na div da secao de linha: quando `highlightNextStep` esta ativo, adicionar `ring-2 ring-primary ring-offset-2 animate-pulse` por 3-4 segundos

## Arquivo afetado

1. `src/pages/MonteSeuCardapio.tsx` - Adicionar ref, scroll, destaque e toast atualizado
