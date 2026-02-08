

## Exibir pesos (proteína, carboidrato, etc.) nos pedidos importados do WhatsApp

### Problema

Quando um pedido é importado via WhatsApp, os itens são salvos com o nome exato que o cliente digitou (ex: "Carne moída, aipim e mix de legumes"). Na hora de exibir no modal de detalhes do pedido, o sistema tenta buscar a composição de pesos usando esse nome como chave no mapa de sabores do catálogo. Como o nome não bate exatamente com o catálogo, a composição não é encontrada e os pesos não aparecem.

### Solução em 2 partes

**Parte 1 - WhatsAppOrderImporter.tsx (salvar com nome do catálogo)**

Na hora de criar o pedido (função `createOrder`), usar o `matchedName` (nome encontrado no catálogo) no campo `flavors[].name` em vez do nome cru digitado pelo cliente. O nome original continua no campo `item.name` para referência.

```
// Antes (linha 232-236):
flavors: item.type === 'marmita' ? [{
  name: item.name,          // "Carne moída, aipim e mix de legumes"
  quantity: item.quantity,
  category: 'carnes',
}] : undefined,

// Depois:
flavors: item.type === 'marmita' ? [{
  name: item.matchedName,   // "Carne moída com arroz e feijão" (do catálogo)
  quantity: item.quantity,
  category: 'carnes',
}] : undefined,
```

**Parte 2 - OrdersManager.tsx (fallback fuzzy para pedidos antigos)**

Para pedidos já existentes onde o `flavors[].name` é o texto cru, adicionar um fallback: se o nome exato não for encontrado no `flavorSidesMap`, buscar a chave mais similar (substring match). Isso garante que pedidos antigos também mostrem os pesos.

```
// Na renderização de flavors (linha 1509):
// Antes:
const composition = getFlavorDescription(flavorSidesMap[flavor.name] ?? null, inferredLineType);

// Depois:
let sidesData = flavorSidesMap[flavor.name] ?? null;
// Fallback: buscar por substring se nome exato não encontrou
if (!sidesData) {
  const normalizedName = flavor.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchKey = Object.keys(flavorSidesMap).find(key => {
    const normalizedKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName);
  });
  if (matchKey) sidesData = flavorSidesMap[matchKey];
}
const composition = inferredLineType ? getFlavorDescription(sidesData, inferredLineType) : null;
```

### Resumo das mudanças

| Arquivo | Mudança |
|---|---|
| `src/components/admin/WhatsAppOrderImporter.tsx` | Linha 233: usar `item.matchedName` em vez de `item.name` no `flavors[].name` |
| `src/components/admin/OrdersManager.tsx` | Linhas 1508-1510: adicionar fallback fuzzy por substring para encontrar composição de pesos quando o nome exato não bate |

Isso resolve tanto pedidos futuros (usando o nome correto do catálogo) quanto pedidos antigos já salvos (fallback por similaridade).

