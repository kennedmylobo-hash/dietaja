

# Composicao por Linha (Fit / Fitness) no JSONB do Sabor

## Resumo

Cada sabor de marmita tera seus pesos/composicoes guardados dentro do campo `sides` ja existente, mas agora separados por linha (`fit` e `fitness`). O admin preenche os dois conjuntos de pesos para cada sabor. O cliente ve apenas a descricao da linha que escolheu.

## Estrutura do JSONB `sides`

O campo `sides` (que ja existe e esta vazio `[]`) passara a ter este formato:

```text
{
  "fit": [
    { "name": "Carne moida", "weight": 100 },
    { "name": "Aipim", "weight": 150 },
    { "name": "Mix de salada", "weight": 50 }
  ],
  "fitness": [
    { "name": "Carne moida", "weight": 150 },
    { "name": "Salada de legumes", "weight": 100 },
    { "name": "Feijao fradinho", "weight": 200 }
  ]
}
```

Nenhuma migracao de banco necessaria - o campo `sides` ja e JSONB e aceita qualquer estrutura.

## Mudancas

### 1. Painel Admin - MenuManager.tsx (aba Sabores)

Na listagem de cada sabor, adicionar um botao "Editar Composicao" que abre um mini-formulario inline ou modal com duas colunas:

| FIT (300g) | FITNESS (450g) |
|---|---|
| Ingrediente + peso | Ingrediente + peso |
| [+ Adicionar] | [+ Adicionar] |

- O admin adiciona linhas com nome do ingrediente e peso em gramas
- O total e calculado automaticamente e exibido (ex: "Total: 300g")
- Ao salvar, grava no campo `sides` no formato `{ fit: [...], fitness: [...] }`
- Sabores que nao tiverem composicao preenchida continuam funcionando normalmente (fallback para descricao padrao)

### 2. Funcao utilitaria - src/lib/flavor-description.ts (novo)

```text
getFlavorDescription(sides: JSON, lineType: 'fit' | 'fitness'): string
```

Gera automaticamente a descricao legivel, ex:
- Input: sides.fit = [{ name: "Carne moida", weight: 100 }, { name: "Aipim", weight: 150 }]
- Output: "100g Carne moida + 150g Aipim"

### 3. Frontend (cliente) - Cardapio e Selecao de Sabores

- `FlavorSelectionModal.tsx`: Ao lado de cada sabor, mostrar a descricao da composicao baseada na linha do pacote selecionado (fit ou fitness)
- `ProductCard.tsx` / `CategorySection.tsx`: Exibir a descricao na listagem do cardapio quando disponivel
- A linha (`line_type`) ja vem do pacote selecionado (`marmita_packages.line_type`), entao o sistema ja sabe qual composicao mostrar

### 4. Producao (admin) - ProductionPanel.tsx

- Atualizar `getFlavorSides` para receber o `line_type` do pedido e buscar os pesos corretos (`sides.fit` ou `sides.fitness`)
- A lista de producao mostrara os pesos exatos por linha

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/lib/flavor-description.ts` | **Novo** - Funcao para gerar descricao a partir do JSONB |
| `src/components/admin/MenuManager.tsx` | Adicionar editor de composicao por linha em cada sabor |
| `src/components/FlavorSelectionModal.tsx` | Exibir descricao da composicao baseada na linha |
| `src/components/admin/ProductionPanel.tsx` | Usar `line_type` para buscar pesos corretos |
| `src/hooks/useMenuData.ts` | Incluir `sides` no tipo `MarmitaFlavor` |

## Fluxo

```text
Admin preenche composicao
        |
        v
sides = { fit: [...], fitness: [...] }
        |
        v
  Cliente seleciona pacote Fit 14un
        |
        v
  Modal de sabores mostra: "100g Carne moida + 150g Aipim + 50g Mix"
        |
        v
  Pedido confirmado
        |
        v
  Producao ve: "150g Carne moida + 100g Salada + 200g Feijao" (se fitness)
              ou "100g Carne moida + 150g Aipim + 50g Mix" (se fit)
```

## Secao Tecnica

- O campo `sides` ja existe como `Json | null` na tabela `marmita_flavors` - nao precisa de migracao
- O tipo no `useMenuData.ts` precisa incluir `sides` na interface `MarmitaFlavor`
- O `saveMarmitaFlavors` no MenuManager precisa salvar o campo `sides` junto
- O `line_type` do pacote (emagrecimento/hipertrofia) sera mapeado para fit/fitness no JSONB
- Fallback: se `sides` estiver vazio ou nao tiver a linha, nenhuma descricao e exibida (comportamento atual)

