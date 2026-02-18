

# Filtrar Ingredientes do Audio pela Base de Dados

## Resumo

Atualizar a funcao `parse-voice-preferences` para consultar os ingredientes disponíveis no banco de dados e instruir a IA a retornar apenas os que existem no catalogo. Ingredientes que o cliente mencionar mas que nao existem (ex: salmao, file mignon, grao de bico) serao ignorados silenciosamente.

## Como funciona hoje

A IA recebe o texto transcrito e extrai qualquer ingrediente mencionado, mesmo que a empresa nao trabalhe com ele. Isso pode gerar cardapios impossiveis de produzir.

## Como vai funcionar

1. A edge function `parse-voice-preferences` vai consultar o banco de dados (`marmita_flavors` e `marmita_sides`) para montar a lista de ingredientes disponiveis
2. Essa lista e passada no prompt do sistema para a IA, com instrucao clara: "Retorne APENAS ingredientes desta lista"
3. Se o cliente mencionar algo fora da lista (ex: salmao, grao de bico), a IA simplesmente ignora
4. A mesma logica sera aplicada na funcao `generate-meal-plan` para garantir consistencia

## Ingredientes disponiveis atuais (extraidos do banco)

**Proteinas** (da tabela `marmita_flavors`):
- Carne moida, carne bovina em cubos, estrogonofe de carne, almôndegas, carne suina, peixe
- Frango desfiado, frango em cubos, frango grelhado, estrogonofe de frango, frango a parmegiana

**Carboidratos** (das tabelas `marmita_flavors` + `marmita_sides`):
- Arroz, aipim, batata doce, feijao, macarrao/espaguete, pure

**Mix/Legumes** (da tabela `marmita_sides`):
- Legumes, mix de salada, salada de legumes

## Mudancas tecnicas

### 1. Edge function `parse-voice-preferences` (principal mudanca)

- Importar o client Supabase com service role para consultar as tabelas
- Buscar nomes distintos de `marmita_flavors` (ativos) e `marmita_sides` (ativos)
- Extrair palavras-chave de proteinas e carboidratos dos nomes dos sabores
- Montar lista de ingredientes permitidos e incluir no prompt do sistema
- Exemplo de prompt atualizado:

```text
INGREDIENTES DISPONÍVEIS (use APENAS estes):
Proteínas: carne moída, carne bovina em cubos, estrogonofe de carne, almôndegas, carne suína, peixe, frango desfiado, frango em cubos, frango grelhado, estrogonofe de frango, frango à parmegiana
Carboidratos: arroz, aipim, batata doce, feijão, macarrão, purê
Mix: legumes, mix de salada, salada de legumes

Se o usuário mencionar ingredientes que NÃO estão nesta lista, IGNORE-OS completamente. Retorne apenas ingredientes da lista acima.
```

### 2. Edge function `generate-meal-plan` (consistencia)

- Mesma logica: buscar ingredientes do banco e incluir no prompt
- A IA so vai montar combinacoes com ingredientes que existem no catalogo

### 3. Sem mudancas no frontend

- O fluxo no `MonteSeuCardapio.tsx` permanece o mesmo
- Se todos os ingredientes forem ignorados (cliente so falou coisas fora do catalogo), a IA retorna strings vazias e o toast de sucesso aparece mas os campos ficam vazios - o que e o comportamento correto

## Arquivos afetados

1. `supabase/functions/parse-voice-preferences/index.ts` - Adicionar consulta ao banco e lista de ingredientes no prompt
2. `supabase/functions/generate-meal-plan/index.ts` - Adicionar mesma logica de filtro por ingredientes disponiveis

