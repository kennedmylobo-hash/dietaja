

## Aceitar todos os itens do pedido, mesmo sem match no catálogo

### Problema raiz

O parser atual so aceita itens que tenham match >= 0.75 com o catalogo. Quando o cliente escreve um nome que nao existe no catalogo (ex: "Carne moida, aipim e mix de legumes" -- nao existe carne moida com aipim no banco), o item e simplesmente descartado.

Itens faltantes na screenshot:
- "Frango em cubos, aipim e mix de salada" -- usa virgula em vez de "com", score cai
- "Escondidinho de carne com aipim e mix de salada" -- catalogo tem "Escondidinho de carne bovina com pure de aipim" (nome muito diferente)
- "Carne moida, aipim e mix de legumes" -- NAO EXISTE no catalogo (so tem carne moida com arroz/feijao/graos)

### Solucao

Mudar a logica do `extractItems` em `whatsapp-parser.ts`: quando uma linha tem padrao de quantidade + texto (ex: "2x Escondidinho de carne..."), o item SEMPRE e adicionado a lista, mesmo sem match no catalogo. O match com catalogo serve apenas para enriquecer com tipo e preco, mas nunca para rejeitar.

**Arquivo:** `src/lib/whatsapp-parser.ts`, funcao `extractItems` (linhas 188-239)

Logica nova:
```
// Tenta match com catalogo
const matchResult = findBestMatch(productText, catalog);

if (matchResult && matchResult.confidence >= 0.75) {
  // Match encontrado: usar tipo e preco do catalogo
  items.push({
    name: productText.trim(),
    matchedName: matchResult.item.name,
    quantity,
    unitPrice: matchResult.item.price || 0,
    totalPrice: (matchResult.item.price || 0) * quantity,
    type: matchResult.item.type,
    confidence: matchResult.confidence,
  });
} else {
  // Sem match: aceitar como marmita com preco 0 (sera ajustado pelo lineType)
  items.push({
    name: productText.trim(),
    matchedName: productText.trim(),
    quantity,
    unitPrice: 0,
    totalPrice: 0,
    type: 'marmita',
    confidence: 0,
  });
}
```

Porem, para nao incluir linhas de lixo (saudacoes, "ola", "obrigado"), adicionar um filtro minimo: so aceitar linhas que foram capturadas por um padrao de quantidade (ex: "2x", "5 marmitas de") E que tenham pelo menos 8 caracteres no texto do produto.

### Resumo da mudanca

| Arquivo | Mudanca |
|---|---|
| `src/lib/whatsapp-parser.ts` | Funcao `extractItems`: aceitar TODOS os itens que tenham padrao de quantidade, mesmo sem match no catalogo. Itens sem match entram como tipo 'marmita' com preco 0 e confidence 0. Filtro de tamanho minimo (8 chars) para evitar lixo. |

Isso garante que o pedido do cliente apareca EXATAMENTE como ele escreveu, sem depender do catalogo para decidir se o item existe ou nao.

