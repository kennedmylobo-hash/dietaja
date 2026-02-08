

## Auto-gerar composicao padrao para itens sem cadastro

### Problema

Quando um sabor nao tem composicao cadastrada no banco, o modal mostra "Sem composicao cadastrada" e nao permite editar os pesos. Isso forca o admin a confirmar pedidos sem informacoes de gramatura.

### Solucao

Em vez de mostrar "Sem composicao cadastrada", o sistema vai **auto-gerar uma composicao padrao** baseada no nome do sabor e nas regras de proporcao ja conhecidas, com campos editaveis para o admin ajustar antes de confirmar.

### Regras de auto-geracao

O sistema analisa o nome do sabor para determinar o tipo de prato e aplica as proporcoes corretas:

**Escondidinho** (detectado por "escondidinho" no nome):
- FIT: 120g Proteina + 180g Pure de aipim = 300g
- FITNESS: 175g Proteina + 275g Pure de aipim = 450g

**Standard** (todos os outros - carne moida, frango, etc.):
- FIT: 100g Proteina + 150g Carboidrato + 50g Mix de legumes = 300g
- FITNESS: 150g Proteina + 200g Carboidrato + 100g Mix de legumes = 450g

O nome da proteina sera extraido do nome do sabor (ex: "Carne moida" de "Carne moida, aipim e mix de legumes").

### O que muda no modal

Em vez de:
```
Sem composicao cadastrada
```

Aparece os campos editaveis ja preenchidos com os valores padrao:
```
Ingredientes              [300g / 300g]
[Carne moida    ] [100] g
[Aipim          ] [150] g
[Mix de legumes ] [ 50] g
```

O admin pode editar qualquer campo antes de confirmar. Ao confirmar, os pesos sao salvos no banco como composicao oficial do sabor.

### Detalhes tecnicos

**Arquivo:** `src/components/admin/OrderConfirmationModal.tsx`

1. Criar funcao `generateDefaultSides(itemName: string, lineType: "fit" | "fitness"): FlavorSideItem[]` que:
   - Detecta se e escondidinho (nome contem "escondidinho")
   - Extrai nome da proteina da primeira parte do nome (antes de "com" ou virgula)
   - Extrai nome do carboidrato da segunda parte (aipim, arroz, etc.)
   - Aplica pesos conforme a regra da linha

2. No `useEffect` que inicializa `editableItems`: se `item.sides.length === 0`, chamar `generateDefaultSides` para preencher automaticamente

3. Remover o bloco "Sem composicao cadastrada" -- agora todos os itens sempre terao campos editaveis

### Resumo

| Arquivo | Mudanca |
|---|---|
| OrderConfirmationModal.tsx | Adicionar funcao `generateDefaultSides`, preencher automaticamente itens sem composicao, remover mensagem "Sem composicao cadastrada" |

