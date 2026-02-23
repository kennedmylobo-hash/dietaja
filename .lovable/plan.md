

# Corrigir tela branca ao abrir o Cardápio no celular

## Problema
O botão "Investir na minha saúde" navega para `/cardapio`, mas essa página usa carregamento sob demanda (lazy loading). Em conexões móveis mais lentas, o arquivo pode demorar demais ou falhar, resultando numa tela branca com loading infinito.

## Solução
1. **Carregar a página do Cardápio junto com a página principal** -- como é a página mais importante (o destino do botão principal), ela não deve depender de download extra no momento do clique.
2. **Adicionar tratamento de erro no carregamento** -- para as demais páginas que continuam com lazy loading, adicionar um componente de fallback que mostra uma mensagem amigável caso o carregamento falhe, com botão para tentar novamente.

## Mudanças técnicas

### Arquivo: `src/App.tsx`
- Trocar o import lazy do Cardapio para import direto (eager), igual a página Index
- Adicionar um ErrorBoundary ao redor do Suspense para capturar falhas de carregamento das outras páginas lazy, exibindo um botão "Tentar novamente" em vez de tela branca

Isso garante que ao clicar no botão, o Cardápio abre instantaneamente sem depender de download extra.

