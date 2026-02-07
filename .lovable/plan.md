

## Correção: Banners "Escolha uma opção abaixo" — Visibilidade no Mobile

### Diagnóstico

Verifiquei ao vivo no preview: os 3 cards **estão renderizando** com cores de fundo corretas (verde, terracotta, sage). A correção anterior de defaults está funcionando.

Porém, no mobile (390px), os cards ficam **extremamente pequenos** por estarem em um grid de 3 colunas, o que faz parecer que não aparecem. O texto fica quase ilegível e os cards parecem invisíveis à primeira vista.

Além disso, se você está testando no site de produção (pedidos.dietajavca.com.br), as últimas mudanças **ainda não foram publicadas** — precisa publicar o projeto no Lovable para atualizar.

### Solução

1. **Publicar o projeto** para que as alterações cheguem ao site de produção

2. **Melhorar visibilidade no mobile** — Ajustar o grid para ser mais legível em telas pequenas:
   - Mobile (< 640px): Grid de **1 coluna** com cards mais altos e legíveis
   - Tablet (640px+): Grid de 3 colunas como está hoje

### Mudanças Técnicas

**Arquivo: `src/components/PromoBannersSection.tsx`**

- Alterar a classe do grid de `grid-cols-3` para `grid-cols-1 sm:grid-cols-3`
- Isso faz os cards empilharem verticalmente no mobile, ficando maiores e mais legíveis
- No tablet e desktop, mantém o layout de 3 colunas lado a lado

Apenas **1 linha** de alteração no className do grid container.
