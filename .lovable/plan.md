
# Plano: Otimizar Landing Pages /fit e /fitness para Conversao

## Objetivo
Adicionar as mesmas secoes de conversao da pagina `/detox` nas paginas `/fit` e `/fitness`, mantendo o contexto e objetivo de cada linha de produto.

## O que falta em cada pagina (comparado com /detox)

| Secao | /detox | /fit | /fitness |
|-------|--------|------|----------|
| Helmet com OG completo | Sim | Apenas titulo basico | Apenas titulo basico |
| Meta Pixel ViewContent | Sim | Nao | Nao |
| Meta Pixel AddToCart | Sim | Nao | Nao |
| TestimonialsSection | Sim | Nao | Nao |
| UrgencySection | Sim | Nao | Nao |
| FAQ especifico | Sim (DetoxFAQSection) | Nao | Nao |

## Arquivos a criar

### 1. `src/components/FitFAQSection.tsx`
FAQ especifico para emagrecimento:
- "Quantas calorias tem cada marmita?"
- "Posso comer so marmita fit e emagrecer?"
- "Preciso fazer dieta alem da marmita?"
- "Qual a diferenca entre Fit (300g) e Fitness (450g)?"
- "Posso escolher marmitas sem carboidrato?"
- "Com que frequencia devo pedir?"

### 2. `src/components/FitnessFAQSection.tsx`
FAQ especifico para hipertrofia:
- "Quanta proteina tem em cada marmita?"
- "A marmita substitui o whey pos-treino?"
- "Posso comer antes ou depois do treino?"
- "Qual a diferenca entre Fitness (450g) e Fit (300g)?"
- "Tem opcao com mais carboidrato?"
- "Com que frequencia devo pedir?"

## Arquivos a modificar

### 3. `src/pages/Fit.tsx`
Adicionar:
- `useEffect` import
- `siteConfig` import
- Imports: `TestimonialsSection`, `UrgencySection`, `FitFAQSection`
- **Helmet completo** com OG tags (titulo: "Marmitas Fit 300g - Emagreca com Sabor", imagem: og-image.jpg)
- **ViewContent** pixel event no `useEffect` com `content_name: 'Marmita Fit 300g'`
- **AddToCart** pixel event no `handlePackageSelect`
- **TestimonialsSection** apos BenefitsSection
- **UrgencySection** apos PackageCards
- **FitFAQSection** apos HowItWorks (antes da garantia)

### 4. `src/pages/Fitness.tsx`
Adicionar:
- `useEffect` import
- `siteConfig` import
- Imports: `TestimonialsSection`, `UrgencySection`, `FitnessFAQSection`
- **Helmet completo** com OG tags (titulo: "Marmitas Fitness 450g - Combustivel para Treinos", imagem: og-image.jpg, cor terracotta)
- **ViewContent** pixel event no `useEffect` com `content_name: 'Marmita Fitness 450g'`
- **AddToCart** pixel event no `handlePackageSelect`
- **TestimonialsSection** apos BenefitsSection
- **UrgencySection** apos PackageCards
- **FitnessFAQSection** apos HowItWorks (antes da garantia)

## Estrutura final das paginas (ordem das secoes)

```text
1. Helmet (SEO + OG)
2. LandingHeader
3. LandingHero
4. BenefitsSection
5. TestimonialsSection       <-- NOVO
6. FlavorMenu
7. PackageCards
8. UrgencySection            <-- NOVO
9. HowItWorks
10. FAQ Section              <-- NOVO (FitFAQSection ou FitnessFAQSection)
11. Garantia de Satisfacao
12. FloatingCTA + Cart + Modais
```

## Detalhes Tecnicos

### Helmet OG para /fit
```typescript
<Helmet>
  <title>Marmitas Fit 300g | Dieta Ja - Emagrecimento</title>
  <meta name="description" content="Marmitas de 300g balanceadas para emagrecimento. Porcoes controladas, +30 sabores e praticidade." />
  <meta name="keywords" content="marmita fit, emagrecimento, dieta, marmita 300g, alimentacao saudavel" />
  <link rel="canonical" href="https://dietajavca.com.br/fit" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="Marmitas Fit 300g - Emagreca com Sabor" />
  <meta property="og:description" content="Porcoes controladas de 300g com +30 sabores. Praticidade para sua dieta em Vitoria da Conquista." />
  <meta property="og:url" content="https://dietajavca.com.br/fit" />
  <meta property="og:image" content="https://dietajavca.com.br/og-image.jpg" />
  ...
</Helmet>
```

### Helmet OG para /fitness
```typescript
<Helmet>
  <title>Marmitas Fitness 450g | Dieta Ja - Hipertrofia</title>
  <meta name="description" content="Marmitas de 450g para quem treina pesado. 150g de proteina, alto valor calorico e praticidade." />
  <meta name="keywords" content="marmita fitness, hipertrofia, ganho de massa, marmita 450g, proteina" />
  <link rel="canonical" href="https://dietajavca.com.br/fitness" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="Marmitas Fitness 450g - Combustivel para Treinos" />
  <meta property="og:description" content="Porcao generosa com 150g de proteina. Ideal para ganho de massa em Vitoria da Conquista." />
  <meta property="og:url" content="https://dietajavca.com.br/fitness" />
  <meta property="og:image" content="https://dietajavca.com.br/og-image.jpg" />
  ...
</Helmet>
```

### Pixel Tracking (mesmo padrao do Detox)
```typescript
// ViewContent on load
useEffect(() => {
  if (packages.length > 0 && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_type: 'product_group',
      content_name: 'Marmita Fit 300g', // ou 'Marmita Fitness 450g'
      content_category: 'Emagrecimento', // ou 'Hipertrofia'
      value: avgPrice,
      currency: 'BRL',
    });
  }
}, [packages.length]);

// AddToCart on select
window.fbq('track', 'AddToCart', {
  content_name: pkg.name,
  content_type: 'product',
  content_ids: [pkg.id],
  value: pkg.price,
  currency: 'BRL',
});
```

## Nota sobre imagens OG
As paginas /fit e /fitness utilizarao a imagem OG generica do site (`og-image.jpg`) por enquanto. Imagens OG dedicadas podem ser criadas posteriormente para melhorar ainda mais os previews no WhatsApp.
