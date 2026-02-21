

# Unificacao de Legumes Genericos + Separacao de Ingredientes na Dieta Personalizada

## Problema 1: Producao - Legumes duplicados
Na aba de Producao (Cozinha), ingredientes genericos como "Mix de legumes", "Legumes", "Mix de salada", "Salada" aparecem como entradas separadas. A cozinha precisa de um unico total unificado quando o nome e generico.

## Problema 2: Impressao Termica - Dieta personalizada sem separacao
Na impressao do pedido de dieta personalizada (ex: Daniel), o TOTAL INGREDIENTES mostra tudo junto sem classificar. Alem disso:
- "carne em cubos" deveria ser "carne bovina em cubos"
- "arroz branco" e "feijao" devem aparecer como carboidrato, nao misturados com proteinas
- Quantidades devem ser multiplicadas corretamente (8 marmitas x 150g = 1200g)

---

## Alteracoes

### Arquivo 1: `src/components/admin/ProductionPanel.tsx`

**Normalizar nomes genericos de legumes/salada antes de inserir no ingredientMap**

Adicionar uma funcao `normalizeVeggieName` que unifica nomes genericos:
- "mix de legumes", "legumes", "mix de salada", "salada", "mix variado", "legumes variados" -> todos viram **"Mix de legumes"**
- Nomes especificos (brocolis, cenoura, abobrinha, vagem, etc.) continuam separados

Essa funcao sera aplicada na linha onde o `ingredientKey` e gerado (~linhas 321 e 344), apenas para itens do tipo `salad`.

### Arquivo 2: `src/lib/order-production-utils.ts`

**Mesma normalizacao para impressao de producao por pedido individual**

Aplicar a mesma logica de unificacao no `generateOrderProductionHTML` (~linha 159) onde os `ingredientTotals` sao agregados.

### Arquivo 3: `src/lib/thermal-print.ts`

**Separar TOTAL INGREDIENTES por categoria na dieta personalizada**

1. Classificar cada ingrediente parseado da dieta personalizada como proteina, carboidrato ou legume usando as mesmas keywords ja existentes no projeto
2. Normalizar nomes:
   - "carne em cubos" -> "Carne bovina em cubos"
   - "frango cubos" -> "Frango em cubos"  
3. No rodape TOTAL INGREDIENTES, agrupar por categoria com sub-titulos:
   - Proteinas: 1200g Carne bovina em cubos, 1200g Frango em cubos
   - Carboidratos: 1600g Arroz branco, 1600g Feijao
4. Manter a mesma logica para marmitas normais (nao personalizadas)

---

## Detalhes Tecnicos

**Funcao de normalizacao de legumes** (compartilhada):
```text
GENERIC_VEGGIE_NAMES = [
  "mix de legumes", "legumes", "mix de salada", 
  "salada", "mix variado", "legumes variados",
  "mix legumes", "salada mix"
]

Se nome normalizado (lowercase, sem acento) bate com algum -> retorna "Mix de legumes"
Senao -> mantem nome original
```

**Funcao de normalizacao de proteinas para dieta personalizada**:
```text
"carne em cubos" -> "Carne bovina em cubos"
"carne moida"    -> "Carne bovina moida"  
"carne"          -> "Carne bovina"
"frango cubos"   -> "Frango em cubos"
```

**Classificacao de ingredientes no thermal-print** (reutilizar keywords):
```text
Proteina: carne, frango, peixe, tilapia, etc.
Carbo: arroz, feijao, macarrao, batata, aipim, etc.
Legume: legumes, brocolis, cenoura, mix, salada, etc.
```

**Formato do TOTAL INGREDIENTES na impressao termica**:
```text
--- TOTAL INGREDIENTES ---
  PROTEINAS
  * 1200g Carne bovina em cubos
  * 1200g Frango em cubos
  CARBOIDRATOS
  * 1600g Arroz branco
  * 1600g Feijao
```

