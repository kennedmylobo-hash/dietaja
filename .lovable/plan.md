

# Implementar Meta Pixel + Conversions API (CAPI)

## Problema atual

O codigo ja tem chamadas `fbq('track', 'Purchase')`, `fbq('track', 'AddToCart')` etc em mais de 10 arquivos, mas o **script base do Meta Pixel nunca foi carregado**. Isso significa que nenhum evento esta chegando ao Meta Ads. Alem disso, nao existe rastreamento server-side (CAPI), que e essencial para escalar trafego pago com precisao.

## O que sera feito

### 1. Salvar o Pixel ID no banco de dados
- Atualizar o campo `facebook_pixel_id` do tenant ativo para `513273131671539`

### 2. Inicializar o Meta Pixel no frontend
- Criar um componente `MetaPixel` que injeta o script base do Facebook Pixel dinamicamente
- Usa o `facebook_pixel_id` do tenant (vindo do `useTenantConfig`)
- Carrega apenas uma vez, quando o Pixel ID esta disponivel
- Inclui o snippet padrao: `fbq('init', pixelId)` + `fbq('track', 'PageView')`

### 3. Criar Edge Function `meta-capi` (Conversions API server-side)
- Nova funcao que envia eventos diretamente para a API do Meta via servidor
- Sera chamada na pagina `PagamentoSucesso` quando o pagamento for aprovado
- Envia o evento `Purchase` com valor, moeda, email (hashed), telefone (hashed) e IP do cliente
- Deduplica com o evento do browser usando `event_id` compartilhado

### 4. Integrar a CAPI na pagina de pagamento aprovado
- No `PagamentoSucesso.tsx`, quando `realStatus === 'approved'`, chamar a edge function `meta-capi` em paralelo ao `fbq('track', 'Purchase')`
- Passar o mesmo `event_id` para deduplicacao

### 5. Configurar o token de acesso
- Sera necessario adicionar o secret `META_CONVERSIONS_API_TOKEN` (token gerado no Gerenciador de Eventos do Meta)

## Detalhes tecnicos

### Novo componente: `src/components/MetaPixel.tsx`
- Usa `useEffect` para injetar o script `connect.facebook.net/en_US/fbevents.js` no `<head>`
- Inicializa com `fbq('init', pixelId)` e dispara `PageView`
- Renderizado no `App.tsx` dentro do `TenantProvider`

### Nova Edge Function: `supabase/functions/meta-capi/index.ts`
- Recebe: `event_name`, `event_id`, `value`, `currency`, `customer_email`, `customer_phone`, `source_url`, `tenant_id`
- Busca o `facebook_pixel_id` do tenant no banco
- Faz hash SHA-256 do email e telefone (exigencia do Meta)
- Envia POST para `https://graph.facebook.com/v21.0/{pixel_id}/events`
- Usa o secret `META_CONVERSIONS_API_TOKEN`

### Arquivo: `src/pages/PagamentoSucesso.tsx`
- Gerar `event_id` unico (UUID) para cada Purchase
- Passar para `fbq('track', 'Purchase', data, { eventID: eventId })`
- Chamar `supabase.functions.invoke('meta-capi', { body: { ... } })` com o mesmo `event_id`

### Arquivo: `supabase/config.toml`
- Adicionar `[functions.meta-capi]` com `verify_jwt = false`

## Sequencia de implementacao
1. Adicionar secret `META_CONVERSIONS_API_TOKEN`
2. Salvar Pixel ID no banco do tenant
3. Criar componente `MetaPixel` e adicionar no `App.tsx`
4. Criar edge function `meta-capi`
5. Atualizar `PagamentoSucesso.tsx` para enviar CAPI + deduplicacao

