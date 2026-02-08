

## Corrigir matching de sabores e formato de exibicao

### Problema 1: Sabores errados (graos em vez de aipim)

O parser fez fuzzy match de "Carne moida, aipim e mix de legumes" com "Carne moida com salada de legumes e graos" porque nao existe no banco um sabor chamado "Carne moida com aipim e mix de legumes". O threshold de 0.75 permitiu esse match incorreto.

A solucao e melhorar o matching para dar mais peso a palavras-chave presentes na descricao do usuario. Se o texto do usuario contem "aipim", o match so deve casar com sabores que tambem contenham "aipim". Palavras como aipim, arroz, batata doce, feijao sao diferenciadores — se estao no texto mas nao no sabor candidato, o score deve ser penalizado fortemente.

**Arquivo:** `src/lib/whatsapp-parser.ts`

Mudancas na funcao `findBestMatch`:
- Extrair palavras-chave de acompanhamento do texto do usuario (aipim, arroz, batata doce, feijao, graos, pure)
- Se o texto contem uma dessas palavras e o candidato NAO contem, penalizar o score em 50%
- Isso garante que "carne moida, aipim" nunca case com "carne moida com graos"

### Problema 2: Multiplicador na frente do nome

No modal de detalhes do pedido (`OrdersManager.tsx`, linha 1486), o formato atual e:

```
Carne moida com salada de legumes e graos (2x)  R$ 63,80
```

O correto e:

```
2x Carne moida com salada de legumes e graos  R$ 63,80
```

**Arquivo:** `src/components/admin/OrdersManager.tsx`

Mudanca na linha 1486:
- De: `{item.name} ({item.quantity}x)`
- Para: `{item.quantity}x {item.name}`

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `src/lib/whatsapp-parser.ts` | Penalizar score quando palavras-chave de acompanhamento divergem entre texto e candidato |
| `src/components/admin/OrdersManager.tsx` | Mover multiplicador para frente do nome do item (linha 1486) |
