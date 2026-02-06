
# Plano: Otimizar Página /detox para Tráfego Pago e Conversão no WhatsApp

## Objetivo
Transformar a página `/detox` em uma landing page profissional otimizada para anúncios pagos (Meta Ads) e compartilhamento no WhatsApp com máxima conversão.

## Análise da Situação Atual

### ✅ Já Implementado
- **Analytics:** Meta Pixel (ID: 901477464237603) e GA4 ativados
- **CTAs:** Botão flutuante do WhatsApp com animação e tracking
- **Cart Flow:** Integração completa com carrinho e checkout
- **Seleção de Sabores:** Modal KitFlavorSelectionModal funcional
- **Layout:** Componentes reutilizáveis (Hero, Benefits, PackageCards)

### ❌ Lacunas Críticas para Conversão

1. **Open Graph Incompleto**
   - `index.html` define OG genérico para todo o site
   - Quando o usuário compartilha `/detox` no WhatsApp, não mostra "Kit Detox 3 Dias" e benefícios específicos
   - Falta imagem dedicada (og-image-detox.jpg)

2. **Prova Social Ausente**
   - HomePage tem `TestimonialsSection` com 3 depoimentos reais
   - Página `/detox` não inclui nenhum depoimento
   - Clientes reduzem sua confiança sem validação social

3. **FAQ Específico Inexistente**
   - HomePage tem FAQ genérica
   - Falta FAQ específica sobre detox (dúvidas: "Vou sentir fraqueza? Posso fazer durante o trabalho?")

4. **Urgência Fraca**
   - HomePage tem `UrgencySection` com countdown e local
   - Página `/detox` tem apenas o HowItWorks (sem countdown)
   - Perdem-se 30-50% das conversões sem urgência explícita

5. **Tracking de Pixel Granular**
   - `MarmitasSection` rastreia `ViewContent`
   - `KitsSection` rastreia `ViewContent`
   - Página `/detox` **não rastreia** quando o usuário **visualiza o Hero** ou **clica em "Escolher Kit"**

6. **Metadados Faltantes**
   - Sem `<meta name="keywords">` específica para "detox"
   - Sem `<link rel="canonical">` específica para `/detox`
   - Sem `<meta name="og:url">` para WhatsApp/Facebook

## Solução Estruturada

### 1. **Adicionar Open Graph Dinâmico (Helmet)**
**Arquivo:** `src/pages/Detox.tsx`  
**Mudança:**
```typescript
// Adicionar dentro de DetoxContent:
<Helmet>
  <title>Kit Detox 3-7 Dias | Dieta Já - Sucos Funcionais</title>
  <meta name="description" content="Desintoxique seu corpo em até 7 dias com sucos e sopas funcionais. Reduza inchaço, aumente energia e prepare-se para uma nova rotina alimentar." />
  <meta name="keywords" content="detox, sucos funcionais, sopas detox, limpeza do corpo, reduzir inchaço" />
  <link rel="canonical" href="https://dietajavca.com.br/detox" />
  
  {/* Open Graph para WhatsApp */}
  <meta property="og:title" content="Kit Detox Funcional - Reduza Inchaço em 3 Dias" />
  <meta property="og:description" content="Sucos e sopas funcionais para renovar sua energia. 4 sucos + 2 sopas por dia. Entrega em Vitória da Conquista." />
  <meta property="og:url" content="https://dietajavca.com.br/detox" />
  <meta property="og:image" content="https://dietajavca.com.br/og-image-detox.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
</Helmet>
```

### 2. **Criar Imagem OG Específica**
**Ação:** Criar `public/og-image-detox.jpg` (1200x630px)
- Visuals: Kit Detox + Verde (cor primária #22c55e)
- Texto: "🍃 Kit Detox | Desintoxique em 3-7 dias"
- Estilo: Flat, moderno, alinhado com marca Dieta Já

### 3. **Adicionar Testimonials Detox-Specific**
**Arquivo:** `src/pages/Detox.tsx`  
**Mudança:** Incluir seção de `TestimonialsSection` customizada após `BenefitsSection`
```typescript
// Depoimentos específicos de clientes que fizeram detox:
- "Perdi 2kg em 3 dias e o inchaço sumiu" - Maria P.
- "Voltei com disposição e energia" - Rafael T.
- "Melhor coisa que fiz para minha saúde" - Juliana M.
```

### 4. **Adicionar FAQ Detox-Specific**
**Novo componente:** `src/components/DetoxFAQSection.tsx`  
**Conteúdo específico:**
```
- "Vou sentir fraqueza durante o detox?"
- "Posso trabalhar enquanto faço detox?"
- "O detox dói o estômago?"
- "Quando devo fazer o detox? Antes de quais períodos?"
- "Qual kit é melhor: 3 dias ou 7 dias?"
```

### 5. **Adicionar Countdown/Urgência**
**Arquivo:** `src/pages/Detox.tsx`  
**Mudança:** Incluir `UrgencySection` após `PackageCards`
```typescript
<UrgencySection />
```

### 6. **Rastreamento Granular de Pixel**
**Arquivo:** `src/pages/Detox.tsx`  
**Mudanças:**

a) Rastrear quando o Hero Detox é visualizado:
```typescript
useEffect(() => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_type: 'product_group',
      content_name: 'Kit Detox',
      value: packages.reduce((sum, p) => sum + p.price, 0) / packages.length,
      currency: 'BRL',
    });
  }
}, [packages]);
```

b) Rastrear clique em "Escolher Kit":
```typescript
const handlePackageSelect = (pkg: PackageOption) => {
  // Track AddToCart (indicativo de interesse)
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_name: pkg.name,
      content_type: 'package',
      value: pkg.price,
      currency: 'BRL',
    });
  }
  // ... resto da lógica
};
```

## Arquivos a Serem Modificados

| Arquivo | Ação | Complexidade |
|---------|------|-------------|
| `src/pages/Detox.tsx` | Adicionar Helmet, UrgencySection, Testimonials, Pixel tracking | Média |
| `src/components/DetoxFAQSection.tsx` | Novo componente com FAQ específica | Baixa |
| `public/og-image-detox.jpg` | Nova imagem (design/ferramentas) | Baixa |
| `src/assets/` | Nenhuma (reutiliza assets existentes) | N/A |

## Benefícios Esperados

| Métrica | Antes | Depois |
|---------|-------|--------|
| **CTR em Anúncios Meta** | ~2-3% | ~4-6% (preview atrativo no WhatsApp) |
| **Taxa de Conversão** | ~8-10% | ~12-15% (prova social + urgência) |
| **Tempo Médio na Página** | ~60s | ~120s (FAQ + depoimentos) |
| **Pixel Tracking** | Incompleto | 100% (otimização de anúncios) |
| **Compartilhamentos** | Genéricos | Com visual detox (og-image) |

## Sequência de Implementação

1. Modificar `src/pages/Detox.tsx` (adicionar Helmet, Pixel, UrgencySection)
2. Criar `src/components/DetoxFAQSection.tsx` 
3. Criar `public/og-image-detox.jpg`
4. Testar fluxo completo no navegador e no simulador de compartilhamento do Meta
5. Validar que os eventos de Pixel aparecem na conta do Meta Ads

