

## Corrigir o Parser de Pedidos WhatsApp

O problema atual: o parser mistura pacotes ("Pacote 7 Marmitas", "Kit 3 Dias"), sucos e sopas no mesmo catalogo dos sabores. O fuzzy matching com threshold de 0.6 faz combinacoes erradas. Alem disso, a quebra por virgula separa descricoes como "Frango em cubos, aipim e mix de salada" em fragmentos que cada um vira um item errado.

### O que esta dando errado

1. **Catalogo poluido**: `buildCatalog` junta marmita_packages (ex: "Pacote 7 Marmitas"), kit_packages (ex: "Kit 3 Dias"), sucos, sopas e sabores num unico array. A palavra "marmitas" no texto de entrada acaba casando com "Pacote 7 Marmitas".

2. **Virgula como separador**: O parser faz `text.split(/[\n,;]/)`, entao "Frango em cubos, aipim e mix de salada" vira duas linhas: "Frango em cubos" e "aipim e mix de salada" -- cada uma tenta casar com o catalogo separadamente.

3. **Threshold muito baixo**: Com 0.6, palavras parciais como "carne moida" casam com "Risoto de carne bovina desfiada" ao inves do item correto.

### Solucao

**Arquivo: `src/lib/whatsapp-parser.ts`**

1. **Nao incluir packages e kits no catalogo para matching de itens**: Remover `marmitaPackages` e `kitPackages` do `buildCatalog` (ou criar um catalogo separado so de sabores). Pedidos manuais via WhatsApp sao sempre sabores individuais, nao pacotes.

2. **Nao quebrar por virgula**: Mudar o split de `text.split(/[\n,;]/)` para `text.split(/\n/)` -- cada linha e um item. Virgulas fazem parte da descricao do sabor.

3. **Aumentar threshold**: Subir de 0.6 para 0.75 para evitar matches falsos.

4. **Remover aliases genericos**: Os aliases fixos no final do `buildCatalog` ("carne moida", "frango grelhado", etc) competem com os nomes reais do catalogo e geram duplicatas.

**Arquivo: `src/components/admin/WhatsAppOrderImporter.tsx`**

5. **Passar so sabores para o catalogo**: Ajustar a chamada de `buildCatalog` para nao enviar packages e kits, ja que o admin seleciona o tipo (FIT/FITNESS) manualmente e o preco vem do pacote selecionado -- nao do item individual.

6. **Preco do item baseado no pacote selecionado**: Quando o admin escolhe FIT ou FITNESS, buscar o `unit_price` do pacote correspondente (ex: "Pacote 7 Marmitas" = R$26.90 por unidade) e aplicar a todos os itens. Hoje o preco individual vem zero porque sabores nao tem preco no catalogo.

### Resultado esperado

Com o pedido colado:
```
2x Frango em cubos, aipim e mix de salada
5x Estrogonofe de carne com aipim e mix de salada
5x Almondegas bovina, aipim e mix de legumes
2x Carne moida, aipim e mix de legumes
```

O parser deve identificar:
- 2x Frango em cubos com aipim e mix de salada
- 5x Estrogonofe de carne bovina com aipim e mix de salada
- 5x Almôndegas de carne bovina com aipim e mix de salada (ou legumes)
- 2x Carne moida com aipim e mix de legumes (match parcial)

Sem "Pacote 7 Marmitas", sem "Kit 3 Dias", sem items fantasma.

### Detalhes tecnicos

| Arquivo | Mudanca |
|---|---|
| `src/lib/whatsapp-parser.ts` | Split so por `\n`. Threshold 0.75. Remover aliases duplicados. |
| `src/lib/whatsapp-parser.ts` | `buildCatalog`: nao incluir marmitaPackages nem kitPackages. Remover aliases fixos que ja existem no banco. |
| `src/components/admin/WhatsAppOrderImporter.tsx` | Chamar `buildCatalog` sem packages/kits. Calcular preco unitario baseado no lineType selecionado (buscar unit_price do pacote correspondente). Recalcular subtotal quando lineType mudar. |

