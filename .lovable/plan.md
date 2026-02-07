

## Personalizar a Loja por Tenant + Editor Visual da Landing Page

### Problema Atual

Quando um restaurante acessa sua loja pelo link, varios elementos ainda mostram "Dieta Ja" porque os componentes usam `siteConfig` (valores fixos no codigo) em vez dos dados do tenant carregados do banco. Isso afeta: Logo, Hero, Footer, botao do WhatsApp, mensagens do checkout, SEO, etc.

### Parte 1 — Substituir `siteConfig` pelo TenantContext em toda a loja

Criar um hook `useTenantConfig()` que retorna os mesmos campos de `siteConfig`, porem alimentados pelo `TenantContext`. Isso centraliza a troca e evita editar dezenas de arquivos manualmente.

**Arquivos a modificar:**

| Arquivo | O que muda |
|---|---|
| `src/hooks/useTenantConfig.ts` | **Novo hook** que expoe `brand`, `location`, `contact`, `analytics`, `seo`, `theme` baseados no tenant ativo |
| `src/components/Logo.tsx` | Usa `useTenant()` em vez de `siteConfig.brand.name`. Se tenant tem `logo_url`, exibe a imagem; senao, exibe o nome formatado |
| `src/components/HeroSection.tsx` | Troca `siteConfig.location.city/state` pelo tenant |
| `src/pages/Index.tsx` | Troca todas as refs de `siteConfig` pelo hook — brand name, whatsapp, city, delivery fee, SEO |
| `src/components/WhatsAppFloatingButton.tsx` | Usa whatsapp do tenant |
| `src/components/UrgencySection.tsx` | City e delivery fee do tenant |
| `src/components/MobileStickyBar.tsx` | Se usa siteConfig, trocar |
| `src/components/CheckoutForm.tsx` / `CheckoutSection.tsx` | WhatsApp e delivery fee do tenant |
| `src/components/CartContext.tsx` | Delivery fee do tenant |
| Footer no `Index.tsx` | Brand name, city, state do tenant |

**Resultado:** Ao acessar `?tenant=meurestaurante`, tudo aparece com o nome, cidade, whatsapp e cor do restaurante. Zero referencia ao "Dieta Ja".

### Parte 2 — Editor Visual da Landing Page (estilo CMS)

O editor atual (`LandingEditor.tsx`) ja funciona com formularios por secao. A evolucao seria transformar isso em um editor com **preview ao vivo lado a lado** — o admin edita os campos na esquerda e ve o resultado na direita em tempo real, como um mini-WordPress.

**Abordagem:**

1. Adicionar um **iframe de preview** ao lado do formulario no `LandingEditor.tsx`
2. O iframe carrega a propria loja do tenant (`publicUrl`) 
3. A cada edicao de campo, o conteudo e salvo e o iframe atualiza automaticamente
4. Manter os formularios de edicao existentes (ja funcionam bem), mas agora com preview visual

**Arquivos a criar/modificar:**

| Arquivo | O que muda |
|---|---|
| `src/components/admin/LandingEditor.tsx` | Adiciona layout split-view: formulario (esquerda) + iframe preview (direita). Botao para alternar entre edicao e preview no mobile |

### Sequencia de Implementacao

1. Criar `useTenantConfig` hook
2. Atualizar `Logo.tsx` para usar tenant (com suporte a logo_url)
3. Atualizar `HeroSection.tsx`, `Index.tsx`, e demais componentes
4. Atualizar `WhatsAppFloatingButton`, `UrgencySection`, checkout
5. Adicionar preview ao vivo no `LandingEditor.tsx`

### Resultado Final

- O dono do restaurante compartilha o link da loja e **tudo aparece com a marca dele**: logo, nome, cidade, whatsapp, pixel, cores
- No painel admin, ele edita os textos da landing page e ve o resultado **em tempo real** no preview ao lado
- Isolamento total: cada tenant ve apenas seus dados, suas cores, seu pixel

