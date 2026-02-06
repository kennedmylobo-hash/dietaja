

# Alternancia Video/Foto nos Cards do Clube

## O que muda

Cada card de kit vai alternar automaticamente entre video e foto a cada poucos segundos, criando um efeito visual dinamico e premium. O video toca por alguns segundos, depois faz um fade suave para a foto, e volta ao video -- em loop infinito.

## Como vai funcionar

- Cada card exibe video por ~5 segundos, depois troca para foto por ~3 segundos, e repete
- A transicao entre video e foto sera com fade suave (opacity transition)
- Todos os cards alternam de forma independente

## Midia por kit

| Kit | Video | Foto |
|-----|-------|------|
| Suco Detox | produtos-detox-video.mp4 | produtos-detox.jpg |
| Marmitas | produtos-detox-video.mp4 | marmita-1.png |
| Sopas | produtos-detox-video.mp4 | marmita-2.png |
| Almoco + Janta | produtos-detox-video.mp4 | marmita-3.png |
| Almoco + Suco | produtos-detox-video.mp4 | marmita-1.png |

## Secao Tecnica

### Arquivo editado: `src/components/clube/ClubPlanCards.tsx`

- Atualizar o `kitMediaMap` para incluir tanto `video` quanto `image` por kit
- Criar um estado local (`showVideo`) que alterna via `useEffect` com `setInterval`
- Renderizar ambos (video e foto) empilhados com `position: absolute`, alternando a opacidade entre eles com `transition-opacity duration-700`
- O video continua rodando em background mesmo quando a foto esta visivel, para a transicao de volta ser instantanea

