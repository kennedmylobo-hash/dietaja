

# Monte Seu Cardapio -- Pagina de cardapio personalizado com IA

## Resumo

Criar uma nova pagina `/monte-seu-cardapio` onde o cliente preenche suas preferencias alimentares (proteinas, carboidratos e mix de legumes/salada), escolhe a quantidade de marmitas (10, 20 ou 30) e recebe uma sugestao de cardapio gerada automaticamente por IA (Google Gemini via Lovable AI). Um link para essa pagina sera adicionado no rodape da landing page.

## Fluxo do cliente

1. No rodape da landing page, aparece um link: "Precisando de ajuda para montar seu pedido? Clique aqui"
2. O cliente e levado para `/monte-seu-cardapio`
3. Preenche 3 campos de texto:
   - **Proteinas** (ex: carne moida, strogonoff de frango, almondegas)
   - **Carboidratos** (ex: aipim, arroz integral, feijao preto)
   - **Mix de salada/legumes** (ex: vagem, cenoura, beterraba)
4. Escolhe a quantidade: 10, 20 ou 30 unidades
5. Clica em "Montar meu cardapio"
6. A IA gera uma sugestao de cardapio distribuindo os sabores escolhidos conforme as regras:
   - 10 unidades: ate 3 sabores
   - 20 unidades: ate 5 sabores
   - 30 unidades: ate 10 sabores
   - Padrao Fit: 100g proteina + 150g carboidrato + 50g mix (300g total)
7. O cardapio aparece formatado na tela
8. Botao para enviar o cardapio pelo WhatsApp (pre-preenchido) para finalizar o pedido

## O que sera criado

### 1. Edge function `generate-meal-plan`
- Recebe as preferencias e quantidade
- Chama o Lovable AI (Gemini) com um prompt estruturado contendo as regras de negocio
- Retorna o cardapio sugerido em formato estruturado (JSON via tool calling)

### 2. Pagina `/monte-seu-cardapio`
- Formulario com os 3 campos de preferencia + selecao de quantidade
- Exibicao do cardapio gerado
- Botao WhatsApp para enviar o pedido
- Design alinhado com o restante do site (mesma paleta, Logo, etc.)

### 3. Link no rodape da landing page
- Adicionar no footer do `Index.tsx` um link discreto: "Precisando de ajuda para montar seu pedido?"

## Detalhes tecnicos

### Edge function `supabase/functions/generate-meal-plan/index.ts`
- Usa `LOVABLE_API_KEY` (ja configurado) para chamar `https://ai.gateway.lovable.dev/v1/chat/completions`
- Modelo: `google/gemini-3-flash-preview` (rapido e economico)
- Prompt do sistema com as regras:
  - Distribuir os ingredientes em combinacoes (sabores) respeitando o limite por quantidade
  - Cada marmita: 100g proteina, 150g carboidrato, 50g mix
  - Nomear cada sabor de forma clara
  - Retornar via tool calling um array de sabores com nome, proteina, carboidrato, mix e quantidade
- Sem streaming (resposta unica, rapida)
- CORS habilitado
- Tratamento de erros 429/402

### Pagina `src/pages/MonteSeuCardapio.tsx`
- Formulario com `react-hook-form` + Zod
- Campos textarea para proteinas, carboidratos e mix
- Radio group ou botoes para quantidade (10, 20, 30)
- Estado de loading enquanto a IA processa
- Exibicao do resultado em cards
- Botao WhatsApp com mensagem pre-montada contendo o cardapio completo
- Usa `useTenantConfig` para branding e WhatsApp number

### Rota no `App.tsx`
- Adicionar `Route path="/monte-seu-cardapio"`

### Footer do `Index.tsx`
- Adicionar link com icone: "Precisando de ajuda para montar seu pedido? Clique aqui"

### `supabase/config.toml`
- Adicionar configuracao da nova function com `verify_jwt = false` (pagina publica)

### Arquivos afetados
1. `supabase/functions/generate-meal-plan/index.ts` (novo)
2. `src/pages/MonteSeuCardapio.tsx` (novo)
3. `src/App.tsx` (adicionar rota)
4. `src/pages/Index.tsx` (link no rodape)

