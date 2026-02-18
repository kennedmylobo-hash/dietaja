
# Adicionar Entrada por Audio ao Monte Seu Cardapio

## Resumo

Adicionar um botao de microfone na pagina `/monte-seu-cardapio` que permite ao cliente falar suas preferencias em vez de digitar. O audio e transcrito pelo navegador (Web Speech API) e depois enviado para a IA extrair automaticamente as proteinas, carboidratos e mix, preenchendo o formulario automaticamente.

## Fluxo do cliente

1. O cliente clica no botao "Falar suas preferencias" (abaixo do titulo, antes dos campos de texto)
2. O microfone e ativado e aparece uma indicacao visual de que esta gravando
3. O cliente fala algo como: "Eu gosto de carne moida, strogonoff de frango, almondegas. De carboidrato eu gosto de aipim, arroz integral e feijao preto. E de salada eu gosto de vagem, cenoura e beterraba"
4. Ao parar de falar (ou clicar para parar), o texto transcrito e enviado para uma edge function
5. A IA (Gemini) extrai e separa as preferencias em 3 categorias: proteinas, carboidratos e mix
6. Os campos do formulario sao preenchidos automaticamente
7. O cliente pode editar se quiser, escolher a linha/quantidade e prosseguir normalmente

## Como funciona tecnicamente

### Transcricao: Web Speech API (gratis, no navegador)
- Usa a API nativa do navegador (`webkitSpeechRecognition` / `SpeechRecognition`)
- Funciona em Chrome, Edge, Safari (cobre a maioria dos usuarios mobile)
- Nao consome creditos da Lovable AI
- Se o navegador nao suportar, o botao fica oculto

### Extracao: Edge function `parse-voice-preferences`
- Recebe o texto transcrito
- Usa Lovable AI (Gemini Flash) com tool calling para separar em 3 categorias
- Retorna JSON: `{ proteins: "...", carbs: "...", mix: "..." }`
- Rapido e economico (1 chamada curta por audio)

## O que sera criado/modificado

### 1. Nova edge function: `parse-voice-preferences`
- Recebe `{ transcript: string }`
- Prompt curto pedindo para extrair proteinas, carboidratos e mix do texto livre
- Retorna as 3 categorias separadas via tool calling
- Tratamento de erro para 429/402

### 2. Pagina `MonteSeuCardapio.tsx` atualizada
- Novo botao com icone de microfone antes dos campos de texto
- Estado de gravacao com indicacao visual (icone pulsando, texto "Ouvindo...")
- Apos transcricao, chama a edge function para extrair as preferencias
- Preenche os 3 campos automaticamente com `setValue()`
- Fallback: se o navegador nao suportar, o botao nao aparece

### 3. Config.toml atualizado
- Adicionar `parse-voice-preferences` com `verify_jwt = false`

## Detalhes tecnicos

### Web Speech API no React

```text
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "pt-BR";
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = (event) => {
  // Pega o texto final transcrito
};

recognition.start(); // Inicia gravacao
recognition.stop();  // Para gravacao
```

### Edge function `parse-voice-preferences`

Prompt do sistema:
- "O usuario descreveu por audio os ingredientes que gosta para marmitas fitness. Extraia e separe em 3 categorias: proteinas, carboidratos e mix de legumes/salada."
- Tool calling retorna `{ proteins, carbs, mix }` como strings separadas por virgula

### Interface do botao

- Card destacado com icone de microfone e texto "Prefere falar? Grave um audio!"
- Quando gravando: icone pulsando em vermelho, texto "Ouvindo... fale suas preferencias"
- Apos processar: toast de sucesso e campos preenchidos
- Se navegador nao suportar: card nao aparece (verificacao com `'webkitSpeechRecognition' in window`)

## Arquivos afetados

1. `supabase/functions/parse-voice-preferences/index.ts` (novo)
2. `src/pages/MonteSeuCardapio.tsx` (adicionar botao de audio e logica)
3. `supabase/config.toml` (adicionar nova function)
