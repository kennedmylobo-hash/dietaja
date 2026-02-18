

# Corrigir Timeout do Áudio - Monte Seu Cardápio

## Problema Raiz

A edge function `parse-voice-preferences` está enviando uma lista de ingredientes com **muitos nomes duplicados** para a IA. Nos logs, a lista de proteínas tem ~70 itens, sendo que muitos são repetidos (ex: "Estrogonofe de frango com arroz e mix de salada" aparece 3x). Isso gera um prompt enorme que demora ~21 segundos só para a IA processar, estourando o timeout de 30s do frontend.

## Correções

### 1. Deduplicar ingredientes na edge function (causa raiz)

Usar `Set` para eliminar duplicatas antes de montar o prompt. Isso reduz drasticamente o tamanho da lista enviada à IA.

**Arquivos**: 
- `supabase/functions/parse-voice-preferences/index.ts`
- `supabase/functions/generate-meal-plan/index.ts` (mesma correção)

Onde: na funcao `fetchAvailableIngredients`, ao montar as listas:

```text
// Antes:
const proteins = flavors.map((f) => f.name);

// Depois:
const proteins = [...new Set(flavors.map((f) => f.name))];
```

Aplicar o mesmo para `carbSides`, `mixSides` e `finalMix`.

### 2. Aumentar timeout do frontend para 45s

30 segundos é apertado considerando cold start da edge function + query ao banco + chamada à IA. Aumentar para 45s como margem de segurança.

**Arquivo**: `src/pages/MonteSeuCardapio.tsx` (linha 95)

```text
setTimeout(() => reject(new Error("timeout")), 45000)
```

## Resultado Esperado

- Lista de proteínas reduzida de ~70 para ~25-30 itens únicos
- Prompt da IA significativamente menor
- Tempo de resposta da IA cai de ~21s para ~5-10s
- Timeout do frontend com margem confortável

## Arquivos afetados

1. `supabase/functions/parse-voice-preferences/index.ts` — deduplicar com Set
2. `supabase/functions/generate-meal-plan/index.ts` — deduplicar com Set
3. `src/pages/MonteSeuCardapio.tsx` — aumentar timeout para 45s
