
# Atualizar menu mobile de navegacao

## O que muda

### 1. SideNavigation (menu flutuante que aparece ao rolar)
- Renomear "Massa" para "Hipertrofia" no item que aponta para `marmitas-fitness`
- Manter os demais labels iguais (Detox, Emagrecer, Dieta, FAQ)

### 2. Cards de navegacao na pagina inicial (mobile)
Adicionar uma secao de cards explicativos abaixo do hero, visivel apenas no mobile, com 3 cards:

| Card | Titulo | Descricao curta | Ancora |
|------|--------|-----------------|--------|
| Kit Detox | Kit Detox | Sucos e sopas funcionais para desintoxicar | #kits |
| Kit Emagrecimento | Kit de Marmitas Emagrecimento | Marmitas fit 300g para perder peso | #marmitas-fit |
| Kit Hipertrofia | Kit de Marmitas Hipertrofia | Marmitas fitness 450g para ganho de massa | #marmitas-fitness |

Cada card ao clicar faz scroll suave ate a secao correspondente.

## Detalhes tecnicos

### Arquivo: `src/components/SideNavigation.tsx`
- Linha 11: trocar `label: "Massa"` por `label: "Hipertrofia"`

### Novo componente ou secao inline em `src/pages/Index.tsx`
- Adicionar 3 cards responsivos logo apos o `PromoBannersSection`
- Visivel apenas em mobile (`md:hidden`)
- Layout: coluna vertical com 3 cards com icone, titulo e descricao curta
- Estilo consistente com o design existente (bg-card, rounded-xl, border, sombra leve)
- Ao clicar, scroll suave para a secao correspondente

### Arquivo: `src/components/cardapio/MobileNav.tsx`
- Atualizar categorias: trocar "Fit 300g" por "Emagrecimento" e "Fitness 450g" por "Hipertrofia"
