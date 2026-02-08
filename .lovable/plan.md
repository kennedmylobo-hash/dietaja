

## Garantir que pesos SEMPRE aparecam nos pedidos

### Problema

Pedidos importados do WhatsApp salvam nomes como "Frango em cubos, aipim e mix de legumes" mas o catalogo tem "Frango em cubos com aipim e mix de salada". O fuzzy match atual usa substring completa, que falha quando as palavras diferem (ex: "legumes" vs "salada", virgula vs "com").

### Solucao

**Arquivo:** `src/components/admin/OrdersManager.tsx`

Substituir o fuzzy match por um algoritmo de **similaridade por palavras-chave**: extrair palavras significativas do nome do sabor e encontrar o registro do catalogo com maior sobreposicao de palavras. Isso garante que "Frango em cubos, aipim e mix de legumes" encontre "Frango em cubos com aipim e mix de salada" porque compartilham as palavras-chave principais (frango, cubos, aipim).

**Mudanca na area de renderizacao de flavors (~linhas 1508-1516):**

```typescript
// Substituir o fuzzy match atual por:
let sidesData = flavorSidesMap[flavor.name] ?? null;
if (!sidesData) {
  // Extrair palavras significativas (ignorar preposicoes)
  const stopWords = new Set(['com', 'de', 'e', 'em', 'ao', 'a', 'o', 'mix', 'da', 'do']);
  const extractWords = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[\s,]+/).filter(w => w.length > 1 && !stopWords.has(w));

  const targetWords = extractWords(flavor.name);
  let bestMatch = '';
  let bestScore = 0;

  for (const key of Object.keys(flavorSidesMap)) {
    const keyWords = extractWords(key);
    const overlap = targetWords.filter(w => keyWords.includes(w)).length;
    const score = overlap / Math.max(targetWords.length, keyWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = key;
    }
  }
  if (bestMatch) sidesData = flavorSidesMap[bestMatch];
}
```

**Tambem corrigir o carregamento do mapa (~linha 238):** Remover a condicao `Object.keys(flavorSidesMap).length === 0` para sempre recarregar ao abrir um pedido diferente, evitando cache vazio.

### Resumo

| Arquivo | Mudanca |
|---|---|
| `src/components/admin/OrdersManager.tsx` | Linhas 1508-1516: substituir fuzzy substring por match por palavras-chave com score minimo de 50% |
| `src/components/admin/OrdersManager.tsx` | Linha 238: remover condicao de cache para garantir que o mapa de sabores sempre carregue |

Com isso, nenhum pedido ficara sem peso -- mesmo que o nome salvo seja diferente do catalogo, o sistema encontra o sabor mais proximo e exibe a composicao.
