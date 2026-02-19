

# Corrigir Meta Tags para Crawlers (WhatsApp/Facebook/Google)

## Problema
Bots e crawlers (WhatsApp, Facebook, Google) nao executam JavaScript. Eles leem o HTML cru do `index.html`, que mostra titulos e descricoes genericas da plataforma em vez dos dados do tenant real ("Dieta Ja").

O React Helmet so corrige isso apos o JS carregar no navegador do usuario -- bots nao esperam isso.

## Solucao proposta

Como o deploy principal e para o tenant "Dieta Ja" (dominio `pedidos.dietajavca.com.br`), a abordagem mais pratica e atualizar o `index.html` com os dados reais desse tenant.

### Alteracoes no `index.html`

Atualizar as meta tags estaticas com os dados do tenant "Dieta Ja":

- `<title>` -> "Dieta Ja | Alimentacao Saudavel Pronta em Vitoria da Conquista"
- `og:title` -> "Dieta Ja | Alimentacao Saudavel Pronta em Vitoria da Conquista"
- `description` e `og:description` -> "Marmitas saudaveis e kits detox prontos para sua rotina em Vitoria da Conquista - BA. Peca online com Pix e receba com praticidade."
- `og:url` -> "https://pedidos.dietajavca.com.br"
- `og:image` -> URL da imagem OG do tenant (se existir) ou `/og-image.jpg`

### Alteracoes no `src/config/site.ts`

Atualizar os fallbacks do `siteConfig` para refletir os dados da Dieta Ja, garantindo que o SEO default seja sempre consistente:

- `brand.name` -> "Dieta Ja"
- `brand.slogan` -> "Alimentacao Saudavel Pronta"
- `seo.title` -> "Dieta Ja | Alimentacao Saudavel Pronta em Vitoria da Conquista"

## Detalhes tecnicos

### Arquivo: `index.html`
- Linha do title: substituir por "Dieta Ja | Alimentacao Saudavel Pronta em Vitoria da Conquista"
- Meta description: incluir cidade e estado
- og:title, og:description, og:url: atualizar com dados do tenant
- Remover referencia a "author" vazio

### Arquivo: `src/config/site.ts`
- Atualizar valores de fallback do `siteConfig` para corresponder ao tenant principal
- Isso garante que mesmo sem banco, o site mostra dados corretos

## Limitacao conhecida
Para uma solucao verdadeiramente multi-tenant (cada dominio mostrando meta tags diferentes para bots), seria necessario um proxy/edge middleware que injete as tags dinamicamente. Isso pode ser implementado futuramente como uma edge function que serve HTML customizado por dominio. Por agora, a solucao direta resolve o problema imediato da campanha.

