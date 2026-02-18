
# Melhorias e Otimizacoes - Monte Seu Cardapio

## 1. Feedback quando todos os ingredientes sao ignorados

**Problema**: Se o cliente falar apenas ingredientes que nao existem no catalogo (ex: "salmao, file mignon, grao de bico"), os campos ficam vazios sem explicacao.

**Melhoria**: Detectar quando a IA retornou tudo vazio e mostrar um toast explicativo: "Nao encontramos esses ingredientes no nosso catalogo. Tente novamente com outros ingredientes!"

**Arquivo**: `src/pages/MonteSeuCardapio.tsx` (no `parseTranscript`, checar se proteins/carbs/mix vieram vazios)

---

## 2. Scroll automatico para o resultado apos gerar o cardapio

**Problema**: Quando o cardapio e gerado, o resultado aparece abaixo do botao mas o cliente pode nao ver se a tela nao rolar.

**Melhoria**: Adicionar um `useRef` na secao de resultados e fazer `scrollIntoView` apos `setFlavors`.

**Arquivo**: `src/pages/MonteSeuCardapio.tsx`

---

## 3. Botao "Gerar novamente" para refazer o cardapio sem preencher tudo de novo

**Problema**: Se o cliente nao gostar do resultado, precisa rolar ate o botao "Montar meu cardapio" e clicar de novo.

**Melhoria**: Adicionar um botao "Nao gostei, gerar outro" na secao de resultados que resubmete o formulario com os mesmos dados.

**Arquivo**: `src/pages/MonteSeuCardapio.tsx`

---

## 4. Mostrar ingredientes disponiveis como sugestoes (chips clicaveis)

**Problema**: O cliente pode nao saber quais ingredientes estao disponiveis e digitar algo que sera ignorado.

**Melhoria**: Buscar os ingredientes do banco e mostrar como chips/tags clicaveis abaixo de cada campo. Ao clicar, o ingrediente e adicionado ao textarea.

**Arquivos**: 
- `src/pages/MonteSeuCardapio.tsx` (UI dos chips + query para buscar ingredientes)
- Usa a mesma query de `marmita_flavors` e `marmita_sides` ja existente no backend

---

## 5. Cache dos ingredientes disponiveis nas edge functions

**Problema**: Ambas edge functions (`parse-voice-preferences` e `generate-meal-plan`) fazem uma query ao banco toda vez que sao chamadas para buscar ingredientes disponiveis.

**Melhoria**: Como os ingredientes mudam raramente, adicionar um cache em memoria com TTL de 5 minutos para evitar queries repetitivas.

**Arquivos**:
- `supabase/functions/parse-voice-preferences/index.ts`
- `supabase/functions/generate-meal-plan/index.ts`

---

## 6. Loading skeleton nos pacotes de quantidade

**Problema**: Enquanto os pacotes carregam do banco, a secao de quantidade fica vazia sem feedback visual.

**Melhoria**: Mostrar skeletons de loading enquanto a query de pacotes esta carregando.

**Arquivo**: `src/pages/MonteSeuCardapio.tsx`

---

## Resumo de prioridade

| Melhoria | Impacto | Esforco |
|----------|---------|---------|
| 1. Feedback ingredientes vazios | Alto | Baixo |
| 2. Scroll para resultado | Alto | Baixo |
| 3. Botao "Gerar novamente" | Medio | Baixo |
| 4. Chips de ingredientes | Alto | Medio |
| 5. Cache nas edge functions | Baixo | Baixo |
| 6. Loading skeleton | Baixo | Baixo |

## Detalhes tecnicos

### Melhoria 1 - Feedback vazio
No `parseTranscript`, apos receber a resposta:
```text
if (!data.proteins && !data.carbs && !data.mix) {
  toast.warning("Nao encontramos esses ingredientes no nosso catalogo. Tente com outros!");
  return;
}
```

### Melhoria 2 - Scroll resultado
Novo `resultsRef = useRef()` na div de resultados, com `scrollIntoView` no callback de sucesso do `onSubmit`.

### Melhoria 3 - Botao regenerar
Um botao que chama `handleSubmit(onSubmit)()` novamente, posicionado junto aos botoes de acao.

### Melhoria 4 - Chips de ingredientes
Nova query `useQuery` para buscar `marmita_flavors` e `marmita_sides` ativos. Renderizar como badges clicaveis que fazem append no textarea correspondente via `setValue`.

### Melhoria 5 - Cache
Variavel global no escopo do modulo da edge function:
```text
let cachedIngredients = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
```

### Melhoria 6 - Skeleton
Usar o componente `Skeleton` existente no projeto para mostrar 4 cards placeholder enquanto `isLoading` dos pacotes.

## Arquivos afetados

1. `src/pages/MonteSeuCardapio.tsx` - Melhorias 1, 2, 3, 4 e 6
2. `supabase/functions/parse-voice-preferences/index.ts` - Melhoria 5
3. `supabase/functions/generate-meal-plan/index.ts` - Melhoria 5
