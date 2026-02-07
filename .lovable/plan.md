

## Plano Completo: Remover TODAS as referencias hardcoded ao "Dieta Ja"

### Escopo Total

43 arquivos com referencias hardcoded identificados. O plano esta dividido em 4 blocos independentes para facilitar a implementacao.

---

### BLOCO 1 — Frontend: Componentes da Loja (useTenantConfig)

Substituir `siteConfig` por `useTenantConfig()` em todos os componentes que ainda usam valores estaticos.

| Arquivo | Referencia hardcoded | Correcao |
|---|---|---|
| `src/components/GuaranteeSection.tsx` | `siteConfig.location.city` | Usar `useTenantConfig().location.city` |
| `src/components/FAQSection.tsx` | `siteConfig.location.*`, `siteConfig.location.deliveryFee` | Usar `useTenantConfig()` para city, pickupNeighborhood, deliveryFee |
| `src/components/BeforeAfterSection.tsx` | `siteConfig.brand.name` ("Com a Dieta Ja") | Usar `useTenantConfig().brand.name` |
| `src/components/SalesNotification.tsx` | "Vitoria da Conquista" hardcoded nas locations | Usar `useTenantConfig().location.city` dinamicamente |
| `src/components/TestimonialsSection.tsx` | "Historias reais de Vitoria da Conquista" | Usar `useTenantConfig().location.city` |
| `src/components/ProductGallerySection.tsx` | "Producao semanal em Vitoria da Conquista" | Usar `useTenantConfig().location.city` |
| `src/components/SalesQuizModal.tsx` | `siteConfig.contact.whatsapp` (2 ocorrencias) | Usar `useTenantConfig().contact.whatsapp` |
| `src/components/CartDrawer.tsx` | `siteConfig` + `getWhatsAppLink` | Usar `useTenantConfig()` |
| `src/components/FlavorSelectionModal.tsx` | "Deixar a cargo da Dieta Ja" | Usar `useTenantConfig().brand.name` |
| `src/components/KitFlavorSelectionModal.tsx` | "Deixar a cargo da Dieta Ja" (3 ocorrencias) | Usar `useTenantConfig().brand.name` |
| `src/components/SoftIdentificationModal.tsx` | `localStorage 'dietaja_customer'` | Usar chave com tenant slug: `cart_customer_{tenantId}` |
| `src/components/CartContext.tsx` | `STORAGE_KEY = 'dietaja_customer'` | Chave dinamica baseada no tenant |
| `src/components/clube/ClubHero.tsx` | "Clube Dieta Ja" hardcoded | Usar `useTenantConfig().brand.name` |
| `src/components/admin/AbandonedCartsRecovery.tsx` | "carrinho da Dieta Ja" na msg WhatsApp | Usar tenant brand name |
| `src/components/admin/CustomersManager.tsx` | "Aqui e da Dieta Ja" na msg WhatsApp | Usar tenant brand name |
| `src/components/admin/AdminSidebar.tsx` | Fallback "Dieta Ja" | Ja usa tenant com fallback — OK, manter como fallback seguro |

### BLOCO 2 — Frontend: Paginas (SEO e Meta Tags)

Todas as paginas com `<Helmet>` hardcoded precisam usar `useTenantConfig()`.

| Arquivo | Referencia hardcoded | Correcao |
|---|---|---|
| `src/pages/Cardapio.tsx` | `title: "Cardapio Digital \| Dieta Ja"` | Usar `brand.name` |
| `src/pages/Detox.tsx` | Title, meta keywords "Vitoria da Conquista", canonical `dietajavca.com.br`, og:site_name | Tudo via `useTenantConfig()` |
| `src/pages/Fit.tsx` | Title, canonical, og:description "Vitoria da Conquista", og:site_name "Dieta Ja" | Tudo via `useTenantConfig()` |
| `src/pages/Fitness.tsx` | Idem ao Fit | Tudo via `useTenantConfig()` |
| `src/pages/Obrigado.tsx` | Title "Pedido Enviado - Dieta Ja", canonical `dietajavca.com.br` | Usar `useTenantConfig()` |
| `src/pages/PixPayment.tsx` | `siteConfig.brand.name` | Trocar por `useTenantConfig()` |
| `src/pages/PagamentoSucesso.tsx` | `siteConfig.brand.name`, `getWhatsAppLink` | Trocar por `useTenantConfig()` |
| `src/pages/PagamentoErro.tsx` | `siteConfig.brand.name`, `getWhatsAppLink` | Trocar por `useTenantConfig()` |
| `src/pages/ClubeDietaJa.tsx` | Title "Clube Dieta Ja", canonical, og:title | Tudo via `useTenantConfig()` |

### BLOCO 3 — Utilitarios e Logica

| Arquivo | Referencia hardcoded | Correcao |
|---|---|---|
| `src/lib/label-utils.ts` | "DIETA JA" no header do PDF (2 ocorrencias) | Receber `brandName` como parametro das funcoes `generateLabelsA7` e `generateLabelsThermal` |
| `src/lib/quiz-logic.ts` | `QUIZ_STORAGE_KEY = 'dietaja_quiz_data'`, `INCOMPLETE_LEADS_KEY = 'dietaja_incomplete_leads'` | Manter as chaves fixas (sao internas e nao visíveis ao usuario) ou parametrizar com tenant slug |
| `vite.config.ts` | PWA manifest: "Dieta Ja", "Vitoria da Conquista" | Usar valores genericos ("Sua Loja", "Alimentacao Saudavel") — o PWA manifest e estatico no build, entao nao pode ser dinamico por tenant |

### BLOCO 4 — Edge Functions (Backend)

Funcoes que **ja usam** `getTenantBranding` e estao OK:
- `send-order-approved`
- `send-order-confirmation`  
- `send-status-notification`
- `send-password-reset`

Funcoes que **ainda tem referencias hardcoded** e precisam migrar para `getTenantBranding`:

| Edge Function | Referencia hardcoded | Correcao |
|---|---|---|
| `send-review-request` | `from: "Dieta Ja <pedidos@dietajavca.com.br>"`, tracking URL hardcoded | Importar `getTenantBranding`, buscar branding do pedido, usar `branding.brand_name` e `getTenantBaseUrl` |
| `send-recompra-campaigns` | `from: "Dieta Ja"`, siteUrl hardcoded, footer "Dieta Ja" | Idem |
| `send-cart-reminders` | "Dieta Ja" no corpo, URL `dietajavca.com.br`, "Vitoria da Conquista" | Idem |
| `send-order-pending-email` | Header "Dieta Ja", "Vitoria da Conquista", `from: pedidos@dietajavca.com.br` | Idem |
| `send-pending-reminders` | `from: "Dieta Ja"`, tracking URL hardcoded | Idem |
| `process-pending-notifications` | tracking URL, `from: "Dieta Ja"` | Idem |
| `send-order-whatsapp` | Fallback templates "DIETA JA" (3 templates) | Usar branding no fallback |
| `generate-pix-admin` | Description "Dieta Ja" | Usar `getTenantBranding` |
| `test-whatsapp-connection` | "Teste de conexao Dieta Ja" | Usar branding |
| `send-tenant-invite` | `from: "PedidoJa <pedidos@dietajavca.com.br>"` | Manter "PedidoJa" (e a marca da plataforma SaaS, nao do tenant) — OK |

**Nota sobre o `from` do e-mail**: O dominio `pedidos@dietajavca.com.br` e o unico verificado no Resend. Para multi-tenant real com dominios proprios, cada tenant precisara verificar seu dominio no Resend. Por enquanto, manter `pedidos@dietajavca.com.br` como remetente padrao mas com o **nome** dinamico: `"NomeDaMarca <pedidos@dietajavca.com.br>"`.

### Resumo de Impacto

| Bloco | Arquivos | Tipo |
|---|---|---|
| Bloco 1 - Componentes | 16 arquivos | Frontend (React) |
| Bloco 2 - Paginas | 9 arquivos | Frontend (React) |
| Bloco 3 - Utilitarios | 3 arquivos | Frontend (TS) |
| Bloco 4 - Edge Functions | 9 funcoes | Backend (Deno) |
| **Total** | **~37 arquivos** | |

### Ordem de Implementacao

1. Bloco 1 + 2 juntos (todos usam `useTenantConfig` que ja existe)
2. Bloco 3 (`label-utils` recebe parametro, `vite.config` texto generico)
3. Bloco 4 (Edge Functions migram para `getTenantBranding`)

### Resultado

Apos a implementacao, **nenhum componente, pagina ou funcao backend tera referencia fixa ao "Dieta Ja" ou "Vitoria da Conquista"**. Cada restaurante vera exclusivamente seus proprios dados em todo o sistema — do checkout ao e-mail, da etiqueta ao WhatsApp.

