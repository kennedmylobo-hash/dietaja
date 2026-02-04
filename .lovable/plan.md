

# Plano: Adicionar Imagens Reais nas Landing Pages

## Objetivo

Reutilizar os assets existentes do projeto nas novas landing pages:
- **/fit** e **/fitness**: Usar fotos reais de marmitas
- **/detox**: Usar vídeo real dos produtos detox

---

## Assets Disponíveis

| Asset | Caminho | Uso Atual |
|-------|---------|-----------|
| marmita-1.png | src/assets/marmita-1.png | MarmitasSection (7un) |
| marmita-2.png | src/assets/marmita-2.png | MarmitasSection (14/21un) |
| marmita-3.png | src/assets/marmita-3.png | MarmitasSection (28un) |
| produtos-detox-video.mp4 | src/assets/produtos-detox-video.mp4 | HeroSection principal |

---

## Alterações Propostas

### 1. Página /fit (Marmitas 300g)

**Arquivo:** `src/pages/Fit.tsx`

- Importar: `marmita1` de `@/assets/marmita-1.png`
- Usar no `LandingHero` como `imageUrl`

### 2. Página /fitness (Marmitas 450g)

**Arquivo:** `src/pages/Fitness.tsx`

- Importar: `marmita2` de `@/assets/marmita-2.png`
- Usar no `LandingHero` como `imageUrl`

### 3. Página /detox (Kits Detox)

**Arquivo:** `src/pages/Detox.tsx`

- Importar: `produtosVideo` de `@/assets/produtos-detox-video.mp4`
- Alterar o `LandingHero` para exibir vídeo ao invés de imagem estática

### 4. Componente LandingHero

**Arquivo:** `src/components/landing/LandingHero.tsx`

- Adicionar prop opcional `videoUrl` para suportar vídeo
- Renderizar `<video>` quando `videoUrl` for passado, ou `<img>` quando `imageUrl` for passado

---

## Detalhes Técnicos

### Nova prop no LandingHero

```typescript
interface LandingHeroProps {
  // ... props existentes
  imageUrl?: string;
  videoUrl?: string; // NOVA - para página detox
}
```

### Renderização condicional

```typescript
{videoUrl ? (
  <video
    src={videoUrl}
    autoPlay
    loop
    muted
    playsInline
    preload="metadata"
    className="w-full h-full object-cover"
  />
) : imageUrl ? (
  <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
) : null}
```

---

## Resultado Esperado

| Página | Asset Exibido |
|--------|---------------|
| /fit | Foto marmita-1.png |
| /fitness | Foto marmita-2.png |
| /detox | Video produtos-detox-video.mp4 |

Todos os assets serao importados via Vite, garantindo otimizacao e cache automatico.

