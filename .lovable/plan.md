
# Integrar "Monte Seu Cardapio" ao Carrinho e Checkout

## Resumo

Adicionar um botao "Adicionar ao Carrinho" na pagina Monte Seu Cardapio, ao lado do botao do WhatsApp. Ao clicar, o cardapio gerado pela IA sera transformado em um item do carrinho, e o cliente segue o fluxo normal de checkout (identificacao, entrega/retirada, pagamento PIX).

## O que muda para o cliente

1. Apos gerar o cardapio, o cliente vera dois botoes:
   - **"Adicionar ao Carrinho"** (botao principal, cor primaria) -- segue pro checkout no site
   - **"Enviar pelo WhatsApp"** (botao secundario, verde WhatsApp) -- funciona como hoje

2. Ao clicar em "Adicionar ao Carrinho":
   - O cardapio vira um item do tipo `marmita` no carrinho
   - Os sabores gerados pela IA sao mapeados como `FlavorSelection[]`
   - O carrinho abre automaticamente (CartDrawer)
   - O cliente preenche dados, escolhe entrega e paga via PIX normalmente

## Detalhes tecnicos

### Arquivo: `src/pages/MonteSeuCardapio.tsx`

1. **Importar o hook do carrinho**:
   - `import { useCart } from "@/components/CartContext"`

2. **Importar CartDrawer e CartFloatingButton** para ter acesso ao carrinho nessa pagina

3. **Criar funcao `handleAddToCart`**:
   - Mapeia os `flavors` gerados pela IA para o formato `FlavorSelection[]` do carrinho
   - Cria um `CartItem` com:
     - `type: "marmita"`
     - `name: "Cardápio Personalizado - {lineConfig.label} {lineConfig.weight}g"`
     - `quantity: selectedQuantity`
     - `unitPrice: unitPrice`
     - `totalPrice: totalPrice`
     - `lineType: selectedLine`
     - `flavors: flavorSelections` (mapeados dos sabores da IA)
   - Chama `addItem()` do CartContext
   - Abre o CartDrawer

4. **Adicionar botao na UI** (dentro da secao de resultados, antes do botao WhatsApp):

```text
[Adicionar ao Carrinho]  -- botao primario, ShoppingBag icon
[Enviar pelo WhatsApp]   -- botao secundario (como esta hoje)
```

5. **Garantir que CartProvider envolve essa pagina** (verificar no App.tsx se ja esta la -- provavelmente sim pois e global)

### Mapeamento de sabores

Os sabores da IA vem no formato:
```text
{ name: "Estrogonofe de Frango", protein: "Frango desfiado", carb: "Arroz", mix: "Legumes", quantity: 3 }
```

Precisam ser convertidos para `FlavorSelection[]`:
```text
{ name: "Estrogonofe de Frango", quantity: 3, category: "proteina" }
```

O `name` do flavor sera o nome composto (ex: "Estrogonofe de Frango") e a `category` sera mapeada da tabela `marmita_flavors` (proteina). Como os sabores da IA ja tem a proteina como componente principal, usaremos `category: "proteina"` como padrao.

### Descricao do item no carrinho

Para que o cliente veja os detalhes no carrinho, o campo `description` do CartItem tera um resumo:
```text
"3x Estrogonofe de Frango, 2x Carne Moída com Aipim, 2x Frango Grelhado..."
```

## Arquivos afetados

1. `src/pages/MonteSeuCardapio.tsx` -- Adicionar botao "Adicionar ao Carrinho", importar useCart, criar handleAddToCart
