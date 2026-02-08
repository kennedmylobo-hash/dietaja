

## Usar texto original do pedido e normalizar "mix de salada/legumes"

### Problema raiz

O banco nao tem "Carne moida com aipim e mix de legumes". As opcoes de carne moida sao:
- Carne moida com arroz e feijao
- Carne moida com arroz e legumes
- Carne moida com salada de legumes e graos

O parser faz o match mais proximo e depois exibe o nome do CATALOGO (`matchedName`) em vez do texto ORIGINAL do WhatsApp. Por isso aparece "graos" onde o cliente escreveu "aipim".

### Solucao

**1. Exibir sempre o texto original do pedido**

No componente `WhatsAppOrderImporter.tsx`, em todos os lugares que exibem o nome do item, usar `item.name` (texto original do WhatsApp) em vez de `item.matchedName` (nome do catalogo). O `matchedName` serve apenas para calcular a confianca do match, nao para exibir ao usuario.

- Linha 224 (createOrder): mudar de `item.matchedName || item.name` para `item.name`
- Na listagem de itens no formulario de revisao: garantir que exibe `item.name`

**2. Normalizar "mix de salada" = "mix de legumes" no parser**

No `whatsapp-parser.ts`, antes de fazer o fuzzy match, normalizar ambos os textos (usuario e catalogo) substituindo "mix de salada" por "mix de legumes". Isso melhora o score de match sem alterar o texto original que sera exibido.

**3. Multiplicador na frente (confirmacao)**

Na listagem de itens do importador, garantir que o formato e `2x Nome do item` (ja foi feito no OrdersManager mas precisa confirmar no importador).

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `src/components/admin/WhatsAppOrderImporter.tsx` | Usar `item.name` em vez de `item.matchedName` na exibicao e na criacao do pedido. Formato `{qty}x {name}`. |
| `src/lib/whatsapp-parser.ts` | Normalizar "mix de salada" para "mix de legumes" antes do fuzzy match para melhorar acuracia. |

