

# Mensagem de celebração ao ganhar desconto progressivo

## O que muda

Quando o cliente adicionar marmitas e cruzar uma faixa de desconto (ex: passar de 7 para 14), aparece uma mensagem animada de celebração mostrando:
- "Voce ganhou R$ X de desconto!"
- "Adicione mais Y marmitas para ganhar mais R$ Z de desconto"

A mensagem some automaticamente apos alguns segundos e usa confetti para dar destaque visual.

## Como funciona

1. O sistema detecta quando o total de marmitas cruza uma faixa de desconto (ex: de 7 para 14 unidades)
2. Calcula o desconto real ganho comparando o preco anterior com o novo
3. Exibe um banner verde animado com o valor do desconto conquistado
4. Abaixo, mantém o nudge para a proxima faixa
5. Apos 4 segundos, o banner de celebracao some suavemente

## Detalhes tecnicos

### Arquivo: `src/components/FlavorSelectionModal.tsx`

- Adicionar um state `celebrationInfo` que armazena o desconto ganho quando o usuario cruza uma faixa
- Usar `useEffect` monitorando `totalSelected` e comparando com a faixa anterior via `useRef`
- Quando detectar que cruzou para uma faixa com preco menor:
  - Calcular o desconto total ganho (diferenca de preco por unidade x quantidade atual)
  - Setar `celebrationInfo` com o valor do desconto
  - Disparar confetti (funcao `celebrateCheckout` ja importada)
  - Apos 4 segundos, limpar o `celebrationInfo`
- Renderizar o banner de celebracao acima do nudge existente, com animacao de entrada/saida (AnimatePresence ja disponivel)
- Icone de check ou sparkles com fundo verde para diferenciar do nudge azul/primary

### Layout do banner de celebracao

```
[Sparkles] Voce ganhou R$ 14,00 de desconto!
           +7 marmitas para ganhar mais R$ 21,00
```

O banner tera fundo verde claro, borda verde, e animacao de scale + fade para chamar atencao.

