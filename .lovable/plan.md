
## Modal de Confirmacao com Pesos Editaveis Apos Lancar Pedido WhatsApp

### O que muda

Apos clicar em "Posso lancar esse pedido agora?", em vez de criar o pedido diretamente, o sistema abre um **modal de confirmacao** mostrando o resumo completo do pedido com a **composicao de pesos de cada item** (ex: "100g Carne moida + 150g Aipim + 50g Mix de legumes"). Cada peso e editavel inline, permitindo corrigir gramaturas, quantidades e nomes antes de confirmar definitivamente.

### Fluxo

```text
[Preencher dados] -> [Clicar "Lancar"] -> [Modal de Confirmacao com pesos editaveis]
                                                    |
                                           [Editar pesos/qtd se necessario]
                                                    |
                                           [Confirmar -> Cria o pedido]
```

### Detalhes tecnicos

**Arquivo:** `src/components/admin/WhatsAppOrderImporter.tsx`

1. Novo estado `confirmModalOpen` (boolean) e `confirmItems` (array com dados enriquecidos com pesos do `flavorSidesMap`)

2. No `handleCreateOrder`, apos verificar composicoes (FlavorCompositionModal), em vez de chamar `createOrder()` diretamente, abrir o modal de confirmacao:
   - Para cada item, buscar no `marmitaFlavors` o sabor correspondente (`matchedName`) e extrair os `sides` para a `lineType` selecionada
   - Montar um array `confirmItems` com: nome, quantidade, e lista de ingredientes (nome + peso editavel)

3. O modal exibe:
   - Cabecalho: "Confirmar Pedido de {Nome}"
   - Para cada item:
     - Nome do sabor + quantidade (editavel)
     - Lista de ingredientes com inputs de peso (editaveis)
   - Resumo: valor total, tipo, data/hora entrega, pagamento
   - Botoes: "Voltar" e "Confirmar e Lancar"

4. Se o admin editar um peso no modal, o novo valor e salvo no banco (`marmita_flavors.sides`) alem de ser usado no pedido, assim da proxima vez ja vem correto.

5. Ao clicar "Confirmar e Lancar", chama `createOrder()` normalmente.

### Resumo das mudancas

| Arquivo | Mudanca |
|---|---|
| `src/components/admin/WhatsAppOrderImporter.tsx` | Adicionar estado e logica do modal de confirmacao com pesos editaveis. Intercalar entre a verificacao de composicao e o `createOrder()`. Modal inline no mesmo componente usando Dialog. |

Nenhum arquivo novo necessario -- tudo fica no WhatsAppOrderImporter usando o Dialog existente.
