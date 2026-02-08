
## Reduzir tamanho da impressao (Producao + Montagem)

Vou compactar os estilos CSS das 3 funcoes de impressao no `ProductionPanel.tsx` para que caibam melhor na folha.

### Mudancas em `src/components/admin/ProductionPanel.tsx`

**1. `handlePrintProduction` (linhas 479-486) -- Producao avulsa**
- body: font-size de padrao para `11px`, padding `10px`
- h1: font-size `14px` → `13px`, padding-bottom `5px`
- h2: font-size `16px` → `11px`, margin-top `12px`
- .item: padding `4px 0`
- .weight: font-size `18px` → `12px`
- .protein / .side: padding `4px 6px`, margin `1px 0`

**2. `handlePrintAssembly` (linhas 587-598) -- Montagem avulsa**
- body: font-size `11px`, padding `10px`
- h1: font-size `14px` → `13px`
- h2: font-size `16px` → `11px`, margin-top `12px`, padding `4px 8px`
- .combo: padding `5px 8px`, margin `3px 0`
- .combo-header: font-size `11px`, gap `5px`, margin-bottom `2px`
- .combo-qty: font-size `10px`, padding `1px 6px`
- .combo-details: font-size `9px`
- .customers: font-size `8px`

**3. `handlePrintAll` (linhas 660-675) -- Ja esta compacto, ajustar para ficar uniforme**
- Manter os valores atuais que ja sao menores, mas reduzir mais:
  - body font-size `10px`
  - h1 `12px`, h2 `10px`
  - .combo padding `4px 6px`
  - .combo-details `9px`, .customers `8px`

Resultado: todas as impressoes ficam mais compactas, cabendo em menos folhas.
