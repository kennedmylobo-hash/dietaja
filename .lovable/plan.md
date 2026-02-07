

## Correção: Banners aparecem e somem (conflito de animação)

### Causa Raiz

O componente `BannerCard` usa **duas fontes de animação conflitantes** no `motion.button`:

1. **`variants={itemVariants}`** - controla a entrada (opacity: 0 -> 1, y: 20 -> 0)
2. **`animate={shouldPulse ? {...} : {}}`** - controla o pulse

Quando `shouldPulse` muda de `true` para `false`, o `animate={}` (objeto vazio) **sobrescreve** os valores dos variants, resetando `opacity` para o valor default. Os cards desaparecem.

O mesmo ocorre quando `shouldPulse` e `true`: o objeto de animate nao inclui `opacity: 1`, entao o Framer Motion interpreta como "animar para opacity indefinido", causando flicker.

### Solucao

Remover o `animate` e `transition` condicionais do `motion.button` e usar uma `motion.div` interna separada para o efeito de pulse, sem interferir na animacao de entrada dos variants.

### Mudancas

**Arquivo: `src/components/PromoBannersSection.tsx`**

No componente `BannerCard` (linhas 103-161):

1. **Remover** as props `animate` e `transition` condicionais do `motion.button` (linhas 117-130)
2. **Adicionar** uma `motion.div` wrapper interno que aplica o efeito de pulse (scale + shadow) sem interferir nos variants de entrada

Antes:
```tsx
<motion.button
  variants={itemVariants}
  animate={shouldPulse ? { scale: [1, 1.03, 1], ... } : {}}
  transition={shouldPulse ? { ... } : {}}
  ...
>
```

Depois:
```tsx
<motion.button
  variants={itemVariants}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  ...
>
  {/* Pulse effect via separate animation, no conflict with variants */}
  <motion.div
    animate={shouldPulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
    transition={shouldPulse ? { duration: 0.8, repeat: 2, repeatDelay: 0.3 } : {}}
    className="absolute inset-0 rounded-xl sm:rounded-2xl"
    style={{ pointerEvents: "none" }}
  />
  ...conteudo existente...
</motion.button>
```

Alternativamente (mais simples e confiavel): remover completamente o efeito de pulse e manter apenas `whileHover` e `whileTap`. O pulse e um detalhe cosmético que esta causando o bug critico de invisibilidade.

**Abordagem recomendada**: Remover `animate` e `transition` condicionais, manter tudo o mais igual. 1 arquivo, ~4 linhas removidas.

