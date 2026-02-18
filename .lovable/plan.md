

# Acelerar processamento de voz no Monte Seu Cardapio

## Problema

O processamento do audio demora ~20 segundos porque:

1. A edge function `parse-voice-preferences` envia uma lista ENORME de "proteinas" no prompt da IA -- mas sao nomes completos de pratos (ex: "Carne moida com salada de legumes e graos"), nao ingredientes individuais
2. Isso infla o prompt para milhares de tokens, tornando a resposta lenta mesmo com o modelo `gemini-2.5-flash-lite`
3. O cold start da edge function + consulta ao banco adiciona mais ~1-2s

## Solucao

Duas otimizacoes combinadas que devem reduzir o tempo de ~20s para ~3-5s:

### 1. Extrair palavras-chave de proteina em vez de nomes completos de pratos

Na edge function `parse-voice-preferences`, em vez de enviar todos os nomes de pratos como "proteinas disponiveis", extrair apenas as palavras-chave unicas de proteina (frango, carne, peixe, almondega, estrogonofe, etc). Isso reduz o prompt de ~800 tokens para ~50 tokens.

### 2. Simplificar o prompt da IA

Com listas curtas de ingredientes reais, o prompt fica menor e a resposta vem muito mais rapido.

## Detalhes tecnicos

### Arquivo: `supabase/functions/parse-voice-preferences/index.ts`

Alterar a funcao `fetchAvailableIngredients` para:
- Em vez de usar os nomes completos dos pratos de `marmita_flavors`, extrair palavras-chave de proteina unicas
- Consultar `marmita_sides` separando por categoria corretamente (carboidrato vs vegetal/leguminosa)
- Retornar listas curtas e limpas

```typescript
// ANTES (prompt enorme):
// proteins: "Carne moída com salada de legumes e grãos, Almôndegas de carne bovina com aipim..."
// (800+ tokens)

// DEPOIS (prompt enxuto):
// proteins: "frango, carne bovina, carne moída, almôndegas, estrogonofe, peixe, carne suína"
// (~20 tokens)
```

Logica de extracao de palavras-chave:
- Criar um dicionario de palavras-chave de proteina comuns (frango, carne, peixe, salmao, almondega, estrogonofe, etc.)
- Percorrer os nomes dos pratos e extrair as que aparecem
- Para sides: separar por categoria real do banco (carboidrato, vegetal, leguminosa)

### Arquivo: `src/pages/MonteSeuCardapio.tsx`

Nenhuma alteracao necessaria no frontend -- a otimizacao e 100% no backend.

### Resultado esperado

- Prompt da IA reduzido de ~1000 tokens para ~200 tokens
- Tempo de resposta da IA de ~20s para ~2-4s
- Experiencia do usuario muito mais fluida
