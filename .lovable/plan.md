

# Corrigir Processamento de Audio Travando

## Problema

O audio e capturado corretamente pelo navegador, mas ao enviar para a funcao de backend (`parse-voice-preferences`), a chamada trava sem retornar resposta. O spinner fica girando indefinidamente em "Processando seu audio...".

Causas provaveis:
- A chamada ao gateway de IA pode estar demorando mais que o timeout da funcao
- Se a funcao falha silenciosamente, o `supabase.functions.invoke` pode nao rejeitar a promise, deixando o UI travado

## Solucao

### 1. Adicionar timeout no frontend (`MonteSeuCardapio.tsx`)

Envolver a chamada `supabase.functions.invoke` com um timeout de 30 segundos usando `AbortController` ou `Promise.race`. Se a resposta nao chegar a tempo, mostrar um toast de erro e resetar o estado.

### 2. Adicionar logging na edge function (`parse-voice-preferences`)

Adicionar `console.log` no inicio da funcao e antes/depois da chamada ao gateway de IA para facilitar debug futuro.

### 3. Tratar erro de rede na funcao `parseTranscript`

O `catch` atual pode nao capturar todos os cenarios (ex: timeout de rede, resposta vazia). Garantir que qualquer falha reseta `isParsing` e mostra feedback ao usuario.

## Detalhes tecnicos

### Mudanca no `MonteSeuCardapio.tsx`

Na funcao `parseTranscript`:
- Usar `Promise.race` com um timeout de 30 segundos
- Se o timeout disparar, mostrar toast "Demorou demais. Tente novamente."
- Garantir que o `finally` sempre executa (ja existe, mas reforcar)

```text
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("timeout")), 30000)
);

const result = await Promise.race([
  supabase.functions.invoke("parse-voice-preferences", { body: { transcript } }),
  timeoutPromise,
]);
```

### Mudanca na edge function `parse-voice-preferences`

Adicionar logs:
- `console.log("Received transcript:", transcript.substring(0, 100))`
- `console.log("AI gateway response status:", response.status)`

### Arquivos afetados

1. `src/pages/MonteSeuCardapio.tsx` - Timeout e tratamento de erro melhorado
2. `supabase/functions/parse-voice-preferences/index.ts` - Logs de debug

