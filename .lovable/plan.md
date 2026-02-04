
# Landing Pages de Categoria com Pre-Sell

## Visao Geral

Criar landing pages dedicadas para cada categoria de produto, otimizadas para compartilhamento direto via WhatsApp. Cada pagina terá:
- Explicacao do produto/linha
- Beneficios e diferenciais
- Cardapio de pacotes/sabores
- Selecao integrada com carrinho
- Finalizacao via WhatsApp ou PIX

## Rotas Propostas

| Rota | Categoria | Publico |
|------|-----------|---------|
| `/detox` | Kits Detox (3, 5, 7 dias) | Quem busca desintoxicar |
| `/fit` | Marmitas 300g Emagrecimento | Quem quer emagrecer/definir |
| `/fitness` | Marmitas 450g Hipertrofia | Quem treina pesado |

## Estrutura de Cada Landing Page

```text
+------------------------------------------+
|              HEADER COMPACTO              |
|  Logo + Link Cardapio Completo           |
+------------------------------------------+
|                                          |
|           HERO DA CATEGORIA               |
|  - Titulo impactante                     |
|  - Beneficios principais (3 bullets)     |
|  - Imagem/video do produto               |
|  - Badge de urgencia ("Ultimas unidades")|
|                                          |
+------------------------------------------+
|                                          |
|           O QUE VOCE RECEBE               |
|  - Lista de itens inclusos               |
|  - Fotos dos produtos                    |
|  - Cardapio de sabores expandido         |
|                                          |
+------------------------------------------+
|                                          |
|           ESCOLHA SEU PACOTE              |
|  - Cards dos pacotes disponiveis         |
|  - Precos e economia por unidade         |
|  - Botao "Escolher sabores"              |
|                                          |
+------------------------------------------+
|                                          |
|           COMO FUNCIONA                   |
|  - Passo 1: Escolha o pacote             |
|  - Passo 2: Selecione os sabores         |
|  - Passo 3: Finalize via WhatsApp/PIX    |
|                                          |
+------------------------------------------+
|                                          |
|           GARANTIA E FAQ                  |
|  - Garantia de satisfacao                |
|  - Perguntas frequentes                  |
|                                          |
+------------------------------------------+
|                                          |
|           FLOATING CTA                    |
|  - Botao fixo "Montar meu pedido"        |
|                                          |
+------------------------------------------+
```

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Detox.tsx` | Landing page Kits Detox |
| `src/pages/Fit.tsx` | Landing page Marmitas 300g |
| `src/pages/Fitness.tsx` | Landing page Marmitas 450g |
| `src/components/landing/LandingHero.tsx` | Hero reutilizavel |
| `src/components/landing/BenefitsSection.tsx` | Secao de beneficios |
| `src/components/landing/PackageCards.tsx` | Cards de pacotes |
| `src/components/landing/HowItWorks.tsx` | Como funciona (3 passos) |
| `src/components/landing/FloatingCTA.tsx` | CTA fixo inferior |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar rotas `/detox`, `/fit`, `/fitness` |

## Fluxo do Usuario

```text
Recebe link no WhatsApp
        |
        v
   Abre /fit (exemplo)
        |
        v
   Le sobre a linha Fit 300g
        |
        v
   Explora sabores disponiveis
        |
        v
   Clica "Escolher pacote"
        |
        v
   Modal de selecao de sabores (ja existe)
        |
        v
   Item adicionado ao carrinho
        |
        v
   CartDrawer abre (checkout integrado)
        |
        v
   Finaliza via WhatsApp ou PIX
```

## Detalhes Tecnicos

### Reutilizacao de Componentes

As landing pages vao reutilizar:
- `CartProvider` e `useCart` - sistema de carrinho
- `FlavorSelectionModal` - selecao de sabores marmitas
- `KitFlavorSelectionModal` - selecao de sabores kits
- `CartDrawer` - checkout integrado
- `CartFloatingButton` - botao flutuante do carrinho
- Hooks existentes: `useKitPackages`, `useMarmitaEmagrecimento`, `useMarmitaHipertrofia`, etc.

### Props do LandingHero

```typescript
interface LandingHeroProps {
  category: 'detox' | 'fit' | 'fitness';
  title: string;
  subtitle: string;
  benefits: string[];
  badgeText: string;
  badgeEmoji: string;
  accentColor: string; // 'primary' | 'terracotta' | 'blue'
  imageUrl?: string;
}
```

### Props do PackageCards

```typescript
interface PackageCardsProps {
  packages: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    pricePerUnit: number;
    popular: boolean;
  }>;
  onSelect: (pkg: Package) => void;
  accentColor: string;
  loadingId: string | null;
}
```

## Conteudo das Landing Pages

### /detox - Kits Detox

**Hero:**
- Titulo: "Desintoxique seu corpo em X dias"
- Subtitulo: "Sucos e sopas funcionais para renovar sua energia"
- Beneficios:
  - Reduz inchaco e retencao de liquidos
  - Aumenta disposicao e energia
  - Prepara o corpo para nova rotina alimentar

**Pacotes:**
- Kit 3 Dias (R$ 199)
- Kit 5 Dias (R$ 299) - Mais Vendido
- Kit 7 Dias (R$ 399)

**Cardapio:**
- 4 sabores de sucos (Verde, Rosa, Amarelo, Vermelho)
- 3 sabores de sopas (Abobora, Aipim, Batata-doce)

### /fit - Marmitas 300g

**Hero:**
- Titulo: "Emagreca sem abrir mao do sabor"
- Subtitulo: "Marmitas de 300g balanceadas para sua dieta"
- Beneficios:
  - Porcoes controladas para emagrecimento
  - 36 sabores para nao enjoar
  - Praticidade de refeicao pronta

**Pacotes:**
- 7 marmitas (R$ 26,90/un)
- 14 marmitas (R$ 24,90/un)
- 21 marmitas (R$ 23,90/un)
- 28 marmitas (R$ 22,90/un) - Melhor custo

**Cardapio:**
- Carnes, Frangos, Massas, Especiais (dinâmico do banco)

### /fitness - Marmitas 450g

**Hero:**
- Titulo: "Combustivel para quem treina pesado"
- Subtitulo: "Marmitas de 450g com 150g de proteina"
- Beneficios:
  - 150g proteina + 200g carbo + 100g vegetal
  - Suporte para ganho de massa
  - Mesmos sabores, porcao maior

**Pacotes:**
- 7 marmitas (R$ 31,90/un)
- 14 marmitas (R$ 29,90/un)
- 21 marmitas (R$ 27,90/un)
- 28 marmitas (R$ 26,90/un) - Melhor custo

## Proximos Passos

1. Criar componentes base reutilizaveis (LandingHero, PackageCards, etc.)
2. Criar as 3 landing pages usando os componentes
3. Adicionar rotas no App.tsx
4. Testar fluxo completo de adicao ao carrinho
5. Verificar integracao com WhatsApp

## Beneficios da Solucao

- Links curtos para compartilhar: `dietaja.com/fit`, `dietaja.com/fitness`, `dietaja.com/detox`
- Pre-venda educativa antes da compra
- Reutilizacao do sistema de carrinho existente
- Checkout integrado (WhatsApp ou PIX)
- Analytics separado por landing page
- Mobile-first responsivo
