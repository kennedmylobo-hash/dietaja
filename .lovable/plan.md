

## Mostrar FIT/FITNESS e Pesos no Detalhe do Pedido

Hoje o modal de detalhe do pedido mostra apenas "Pacote 14 Marmitas (7x)" com os sabores listados sem nenhuma indicacao de linha (FIT ou FITNESS) e sem os pesos dos ingredientes. Isso dificulta a conferencia.

### O que muda

| Antes | Depois |
|---|---|
| Pacote 14 Marmitas (14x) | Pacote 14 Marmitas - FIT 300g (14x) |
| - 3x Almondegas de carne bovina... | - 3x Almondegas de carne bovina... |
| (sem pesos) | 100g Almondegas + 150g Batata doce + 50g Mix de legumes |

### Alteracoes

**1. Salvar `lineType` no pedido (CartDrawer.tsx)**

Ao criar o pedido no banco, incluir o campo `lineType` em cada item. Isso garante que pedidos futuros tenham a informacao correta salva.

```
items: items.map(item => ({
  ...existing fields...,
  lineType: item.lineType,  // <-- NOVO
})),
```

**2. Exibir FIT/FITNESS e pesos no modal do pedido (OrdersManager.tsx)**

No modal de detalhes, para itens do tipo `marmita`:
- Inferir a linha: se o item tem `lineType` salvo, usar. Senao, checar se o nome contem "hipertrofia" ou "fitness"
- Mostrar badge "FIT 300g" ou "FITNESS 450g" ao lado do nome do pacote
- Abaixo de cada sabor, exibir a composicao com pesos (ex: "100g Carne + 150g Arroz + 50g Mix de legumes")
- Buscar os dados de composicao da tabela `marmita_flavors` (campo `sides` JSONB), ja utilizada no painel de producao

**3. Carregar dados de sabores no OrdersManager**

Adicionar uma query para buscar `marmita_flavors` (id, name, sides) quando o modal for aberto, para poder exibir os pesos de cada sabor. Reutilizar as funcoes `getFlavorSidesForLine` e `mapLineTypeToKey` ja existentes em `src/lib/flavor-description.ts`.

### Resultado visual no modal

```
Itens
Pacote 7 Marmitas - FIT 300g (7x)          R$ 188,30
  - 3x Almondegas de carne bovina com batata doce e mix de salada
    100g Almondegas + 150g Batata doce + 50g Mix de legumes
  - 2x Frango desfiado com arroz, feijao e legumes
    100g Frango + 100g Arroz + 100g Feijao
  - 2x Frango em cubos com batata doce e mix de salada
    100g Frango + 150g Batata doce + 50g Mix de legumes
```

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `src/components/CartDrawer.tsx` | Salvar `lineType` no item do pedido |
| `src/components/admin/OrdersManager.tsx` | Buscar marmita_flavors, inferir linha, exibir badge e pesos |

### Pedidos antigos

Para pedidos ja existentes que nao tem `lineType` salvo, o sistema vai inferir pela mesma logica do painel de producao: se o nome do item contem "hipertrofia" ou "fitness", eh FITNESS; senao, eh FIT.
