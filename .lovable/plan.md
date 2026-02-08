
# Mapeamento de Proteínas na Lista de Compras

## Problema
A lista de compras mostra o **nome do prato** (ex: "Estrogonofe de carne") em vez do **insumo real** (ex: "Carne pedaço"). Isso impede a compra correta porque pratos diferentes usam o mesmo insumo.

## Solucao

Criar um mapa de **sabor -> insumo real** que converte nomes de pratos nos ingredientes que precisam ser comprados. Isso faz com que pratos diferentes que usam o mesmo corte sejam somados corretamente.

### Regras de mapeamento (conforme informado):

| Sabor no pedido | Insumo real (compra) |
|---|---|
| Estrogonofe de carne | Carne pedaco |
| Almondega | Carne moida |
| Carne desfiada | Carne pedaco |
| Escondidinho de carne | Carne moida |
| Escondidinho de frango | Frango (file de peito) |
| Carne moida | Carne moida |
| Qualquer tipo de frango | File de peito de frango |
| Outros pratos de carne bovina | Carne pedaco (padrao) |

### Exemplo pratico:
- 5x Estrogonofe de carne + 3x Carne desfiada = **8 porcoes de "Carne pedaco"**
- 4x Almondega + 2x Escondidinho de carne = **6 porcoes de "Carne moida"**
- 3x Frango grelhado + 2x Escondidinho de frango = **5 porcoes de "File de peito de frango"**

## Detalhes tecnicos

### Arquivo: `src/components/admin/ShoppingList.tsx`

1. **Adicionar mapa de conversao** -- um dicionario `PROTEIN_INGREDIENT_MAP` que mapeia palavras-chave do nome do sabor para o nome do insumo real:

```text
estrogonofe de carne -> Carne pedaco
almondega / almodegas -> Carne moida
carne desfiada -> Carne pedaco
escondidinho de carne -> Carne moida
escondidinho de frango -> File de peito de frango
carne moida -> Carne moida
frango (qualquer) -> File de peito de frango
peixe / tilapia -> Tilapia
porco / linguica -> Linguica
carne (fallback generico) -> Carne pedaco
```

2. **Criar funcao `resolveProteinIngredient(flavorName)`** que:
   - Normaliza o nome do sabor
   - Percorre o mapa de conversao por ordem de prioridade (matches mais especificos primeiro)
   - Retorna o nome do insumo real para compra

3. **Alterar a logica de agregacao** (linhas 257-272) para usar `resolveProteinIngredient()` em vez de `flavor.name.split(...)` quando `isProtein === true`. Isso garante que pratos diferentes que usam o mesmo insumo sejam somados.

4. **Atualizar fatores de coccao** para os novos nomes de insumos:
   - "Carne pedaco" -> fator 1.35
   - "Carne moida" -> fator 1.30
   - "File de peito de frango" -> fator 1.40
   - Remover entradas antigas que nao se aplicam mais

5. **Manter editavel** -- o administrador ainda pode ajustar fatores via o painel "Fatores" existente.
