

## Corrigir nomes de ingredientes na auto-geracao

### Problema

1. **Escondidinho**: quando o nome diz "escondidinho de carne", o sistema extrai apenas "Carne" como proteina. Mas escondidinho sempre usa "Carne moida" ou "Carne desfiada" -- nunca so "Carne". Precisa aplicar essa regra.

2. **Escondidinho com extras**: quando tem "mix de salada" no nome, o peso da proteina cai de 120g para 100g (FIT). A regra correta para escondidinho com extras e manter 120g proteina + reduzir o pure para caber o mix.

3. **Carboidrato em escondidinho**: sempre deve aparecer como "Pure de aipim" (ja funciona), mas para pratos standard como "Carne moida, aipim e mix de legumes" deve aparecer "Aipim" (ja funciona).

### Mudancas

**Arquivo:** `src/components/admin/OrderConfirmationModal.tsx`

1. **`extractProteinName` (linha 50-58)** -- Adicionar regra: se o nome contem "escondidinho" e a proteina extraida for apenas "carne" (sem qualificador), assumir "Carne moida" como padrao. Se conter "desfiada", usar "Carne desfiada".

2. **Escondidinho com extras (linhas 122-135)** -- Corrigir os pesos para manter as proporcoes corretas:
   - FIT (300g): 120g proteina + pure + extras (mix de salada/legumes a 50g, pure ajustado)
   - FITNESS (450g): 175g proteina + pure + extras (100g, pure ajustado)

### Exemplo esperado

**"Escondidinho de carne com aipim e mix de salada" (FIT 300g):**
```
Carne moida      120g
Pure de aipim    130g
Mix de salada     50g
```

**"Carne moida, aipim e mix de legumes" (FIT 300g):**
```
Carne moida      100g
Aipim            150g
Mix de legumes    50g
```

### Resumo tecnico

| Arquivo | Mudanca |
|---|---|
| OrderConfirmationModal.tsx | `extractProteinName`: regra "carne" -> "Carne moida" para escondidinho |
| OrderConfirmationModal.tsx | `generateDefaultSides`: corrigir pesos do escondidinho com extras (120g/175g proteina) |

