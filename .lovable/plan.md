

## Corrigir penalidade de acompanhamentos no parser

### Problema

O pedido tem 6 itens mas so 4 foram identificados. Os 2 faltantes sao:
- "Escondidinho de carne com aipim e mix de salada"  
- "Carne moida, aipim e mix de legumes"

O motivo: a penalidade de side-dish que adicionamos esta muito agressiva. Quando o usuario digita "aipim", o parser detecta essa keyword. Como nenhum item do catalogo contem "aipim", TODOS os candidatos recebem penalidade de 0.4x, derrubando o score abaixo do threshold de 0.75 e eliminando o item.

A logica atual penaliza quando o usuario tem uma keyword que o candidato NAO tem. Mas o correto e: so penalizar quando o candidato tem uma keyword DIFERENTE (ex: usuario diz "aipim", candidato tem "graos"). Se o candidato nao tem NENHUMA keyword de acompanhamento (e um match generico como "Escondidinho de carne"), nao deve haver penalidade.

### Solucao

**Arquivo:** `src/lib/whatsapp-parser.ts`, funcao `findBestMatch` (linhas 99-106)

Mudar a logica de penalidade:
- Antes: penaliza se o usuario tem keyword que o candidato nao tem
- Depois: penaliza SOMENTE se o candidato tambem tem keywords de acompanhamento E elas sao diferentes das do usuario

```
// Logica corrigida:
if (userKeywords.length > 0) {
  const candidateKeywords = SIDE_KEYWORDS.filter(k => normalizedName.includes(normalizeFull(k)));
  // So penalizar se o candidato TEM keywords diferentes, nao se nao tem nenhuma
  if (candidateKeywords.length > 0) {
    const userHas = userKeywords.some(k => !candidateKeywords.map(c => normalizeFull(c)).includes(normalizeFull(k)));
    if (userHas) {
      score *= 0.4; // Penalidade pesada so quando ha conflito real
    }
  }
}
```

Isso garante que:
- "Escondidinho de carne com aipim" faz match com "Escondidinho de carne" (sem penalidade, catalogo nao tem keyword)
- "Carne moida, aipim" faz match com "Carne moida" generico (sem penalidade)
- "Carne moida, aipim" NAO faz match com "Carne moida com graos" (penalidade aplicada, catalogo tem keyword conflitante)

### Arquivo alterado

| Arquivo | Mudanca |
|---|---|
| `src/lib/whatsapp-parser.ts` | Linhas 99-106: so aplicar penalidade quando candidato tem keywords de acompanhamento conflitantes |

