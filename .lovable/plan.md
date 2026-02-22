
# Melhorias Mobile Identificadas

## Problemas Encontrados

### 1. Pagina Index: navegacao duplicada no mobile
Na pagina inicial mobile, o usuario ve **duas secoes quase identicas** uma apos a outra:
- PromoBannersSection (cards empilhados com apenas o titulo visivel)
- MobileNavCards (3 cards coloridos lado a lado)

Ambas levam aos mesmos destinos. Isso e confuso e ocupa espaco desnecessariamente.

**Solucao:** Esconder o PromoBannersSection no mobile (ja que o MobileNavCards e mais bonito e informativo), ou unificar em uma so secao.

### 2. Pagina Cardapio: cards empilhados verticalmente no mobile
No `/cardapio`, os 3 cards de linha (FIT, FITNESS, DETOX) estao em `grid-cols-1` no mobile, obrigando o usuario a rolar muito para ver todas as opcoes.

**Solucao:** No mobile, usar um layout horizontal com scroll snap (carrossel) para os cards, permitindo ver todos sem rolar a pagina inteira. Ou usar um layout mais compacto com imagem menor.

### 3. FlavorSelectionModal: layout da linha de sabor apertado no mobile
No modal de sabores, o preco e os botoes +/- ficam espremidos do lado direito do nome do sabor. Quando o nome e longo (ex: "Carne moida com arroz e feijao"), tudo fica apertado.

**Solucao:** No mobile, mover o preco para abaixo do nome do sabor (junto com a descricao), deixando mais espaco para os botoes +/- no lado direito.

### 4. PromoBannersSection: informacao escondida no mobile
Os banners mostram apenas o titulo no mobile (`hidden sm:block` no subtitle e description). O usuario perde contexto importante como "Ganhe ate 23% OFF".

**Solucao:** Se mantivermos o PromoBannersSection no mobile, exibir ao menos o subtitle para dar mais contexto.

---

## Plano de Implementacao

### Mudanca 1 -- Esconder PromoBannersSection no mobile
Em `src/pages/Index.tsx`, adicionar `hidden sm:block` ao PromoBannersSection (ou wrapper), ja que o MobileNavCards cobre a mesma funcionalidade de forma superior no mobile.

### Mudanca 2 -- Cards do Cardapio mais compactos no mobile
Em `src/pages/Cardapio.tsx`, mudar o layout dos cards no mobile:
- Usar layout horizontal (flex com scroll snap) ou reduzir o tamanho da imagem no mobile
- Imagem com aspect-ratio menor no mobile (ja tem `aspect-[16/9]` no mobile, mas o card ocupa a tela toda)
- Opcao: card horizontal no mobile (imagem a esquerda, info a direita)

### Mudanca 3 -- Layout responsivo da linha de sabor
Em `src/components/FlavorSelectionModal.tsx`, no bloco de cada sabor (linhas 649-741):
- No mobile: preco aparece abaixo do nome (na coluna esquerda)
- Botoes +/- ficam sozinhos na direita com mais espaco
- Isso melhora a usabilidade touch significativamente

---

### Detalhes Tecnicos

**Arquivo: `src/pages/Index.tsx`**
- Envolver `<PromoBannersSection />` com `<div className="hidden sm:block">` para esconde-lo no mobile

**Arquivo: `src/pages/Cardapio.tsx`**
- Mudar os cards para layout horizontal no mobile:
  - Container: `flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-3` 
  - Cada card: `min-w-[85vw] snap-center md:min-w-0`
  - Isso cria um carrossel swipeable no mobile e grid no desktop

**Arquivo: `src/components/FlavorSelectionModal.tsx`**
- Na div do sabor (linha 650-741), reestruturar para:
  - No mobile: `flex-col` com nome+preco em cima, botoes embaixo a direita
  - Ou: manter `flex-row` mas mover o preco para dentro da coluna do nome

```
// De:
<div className="flex items-center gap-3 shrink-0">
  <span>{preco}</span>
  <button>-</button>
  <span>{qty}</span>
  <button>+</button>
</div>

// Para (mobile):
// Preco fica abaixo do nome
// Botoes ficam sozinhos na direita
```
