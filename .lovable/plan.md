

# Corrigir Eventos Duplicados do Meta Pixel

## Problema encontrado

O evento `Purchase` esta sendo disparado em dois lugares:
- `src/components/CartContext.tsx` (linha ~384) -- dentro de uma funcao trackPurchase no contexto do carrinho
- `src/pages/PagamentoSucesso.tsx` (linha ~108) -- quando o pagamento e confirmado como aprovado

O local correto e **apenas** em `PagamentoSucesso.tsx`, pois e onde o pagamento foi realmente confirmado. O disparo no CartContext acontece antes da confirmacao real, gerando eventos falsos.

Tambem ha duplicacao de `InitiateCheckout` entre CartContext, CartDrawer e Index.

## O que sera feito

### 1. Remover `Purchase` duplicado do CartContext
- Remover o `fbq('track', 'Purchase')` de `src/components/CartContext.tsx`
- Manter apenas o de `PagamentoSucesso.tsx` que ja inclui deduplicacao via CAPI

### 2. Consolidar `InitiateCheckout`
- Manter `InitiateCheckout` apenas no `CartContext.tsx` (funcao de checkout)
- Remover duplicatas em `CartDrawer.tsx` e `Index.tsx`

### 3. Revisar `AddToCart`
- Verificar se `AddToCart` no CartContext ja cobre todos os cenarios
- Remover duplicatas em paginas individuais (Fit, Fitness, Detox) que tambem disparam `AddToCart` ao selecionar pacote -- esses podem ser mantidos pois representam interacoes diferentes (selecao de pacote vs adicao ao carrinho)

## Detalhes tecnicos

### Arquivo: `src/components/CartContext.tsx`
- Remover bloco `fbq('track', 'Purchase')` (linhas ~382-387)
- Manter `fbq('track', 'AddToCart')` e `fbq('track', 'InitiateCheckout')`

### Arquivo: `src/components/CartDrawer.tsx`
- Remover `fbq('track', 'InitiateCheckout')` duplicado (linhas ~402-409)

### Arquivo: `src/pages/Index.tsx`
- Remover `fbq('track', 'InitiateCheckout')` e `fbq('track', 'Contact')` duplicados (linhas ~111-118)

### Nenhuma alteracao em:
- `PagamentoSucesso.tsx` -- este e o local correto e unico para Purchase + CAPI
- `MetaPixel.tsx` -- inicializacao esta correta
- Paginas Fit/Fitness/Detox -- AddToCart nessas paginas rastreia a selecao do pacote, que e uma acao diferente

## Resultado esperado
- Cada Purchase contado apenas 1 vez (com deduplicacao browser + CAPI)
- InitiateCheckout disparado apenas ao iniciar o fluxo de checkout real
- Dados mais precisos no Meta Ads para otimizacao de campanhas

