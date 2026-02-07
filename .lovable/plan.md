

## Otimização Mobile/4G — Preservando TODO o conteúdo visual

Nenhum botão, imagem, foto, vídeo ou texto será removido. Todas as mudanças são "por baixo dos panos" para carregar mais rápido, sem alterar o que o usuário vê.

---

### O que muda (e o que NÃO muda)

| Otimização | O que faz | Remove algo visual? |
|---|---|---|
| Lazy load de seções | Carrega seções conforme o usuário scrolla (em vez de tudo de uma vez) | Não. Tudo aparece igual, só carrega sob demanda |
| Vídeo do Hero | Só começa a baixar quando está na tela | Não. O poster (foto) aparece imediatamente enquanto o vídeo carrega |
| Vídeo da Galeria | Só começa a baixar quando o usuário scrolla até lá | Não. Aparece igual quando chega na seção |
| Banners sem 3D no mobile | Remove efeito de inclinação 3D (que só funciona com mouse) | Não. Os 3 cards ficam iguais, só sem o efeito de mouse que não existe no celular |
| Notificações com delay maior | Popup de depoimento aparece após 10s em vez de 5s no mobile | Não. Mesma notificação, só demora um pouco mais pra aparecer |

---

### Detalhes Técnicos

**1. Lazy load de seções abaixo do fold**
Arquivo: `src/pages/Index.tsx`

Mover para lazy import (com Suspense + skeleton):
- IdentificationSection
- SolutionSection
- BeforeAfterSection
- ProductGallerySection
- KitsSection
- MarmitasSection
- ValueSection

Cada seção aparece normalmente quando o usuário scrolla. Enquanto carrega, mostra um skeleton (placeholder cinza) por frações de segundo.

**2. Vídeo do Hero com Intersection Observer**
Arquivo: `src/components/HeroSection.tsx`

- Manter `preload="none"` e `poster` (já está)
- Adicionar um ref + IntersectionObserver para chamar `video.play()` só quando visível
- A foto poster continua aparecendo instantaneamente
- Nenhuma mudança visual

**3. Vídeo da ProductGallery com lazy play**
Arquivo: `src/components/ProductGallerySection.tsx`

- Remover `autoPlay` do elemento video
- Adicionar IntersectionObserver que chama `.play()` quando o usuário scrolla até a seção
- O vídeo continua aparecendo e tocando normalmente, só não baixa antes da hora

**4. Banners: desativar 3D no touch/mobile**
Arquivo: `src/components/PromoBannersSection.tsx`

- Usar o hook `useIsMobile()` existente
- No mobile: pular os handlers de `onMouseMove` e os transforms 3D (rotateX, rotateY)
- Manter `whileTap` para feedback ao tocar
- Os 3 cards continuam com mesmas cores, ícones, textos e botão "Clique"

**5. SalesNotification: delay maior no mobile**
Arquivo: `src/components/SalesNotification.tsx`

- Usar `useIsMobile()` para detectar mobile
- Mobile: delay inicial de 10s (em vez de 5s)
- Desktop: mantém 5s
- Mesma notificação, mesmo visual

### Arquivos alterados

- `src/pages/Index.tsx` — lazy imports
- `src/components/HeroSection.tsx` — video IntersectionObserver
- `src/components/ProductGallerySection.tsx` — video lazy play
- `src/components/PromoBannersSection.tsx` — desativar 3D no mobile
- `src/components/SalesNotification.tsx` — delay mobile

### Nenhum arquivo novo necessário

O hook `useIsMobile` já existe em `src/hooks/use-mobile.tsx`.

