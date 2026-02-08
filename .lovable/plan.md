

## Diminuir fonte e espacamento na impressao "Imprimir Tudo"

Ajustar os estilos CSS dentro do `handlePrintAll` em `src/components/admin/ProductionPanel.tsx` para gerar uma impressao mais compacta.

### Mudancas no CSS da impressao (linhas 632-647)

| Elemento | Antes | Depois |
|---|---|---|
| body | padding: 20px | padding: 10px; font-size: 11px |
| h1 | font-size: 18px | font-size: 14px; padding-bottom: 5px |
| h2 | font-size: 16px; margin-top: 20px | font-size: 12px; margin-top: 10px |
| .item | padding: 8px 0 | padding: 3px 0 |
| .weight | font-size: 18px | font-size: 12px |
| .protein / .side | padding: 10px; margin: 5px 0 | padding: 4px 8px; margin: 2px 0 |
| .divider | margin: 30px 0 | margin: 15px 0 |
| .combo | padding: 12px; margin: 10px 0 | padding: 6px 8px; margin: 4px 0 |
| .combo-header | gap: 10px; margin-bottom: 8px | gap: 6px; margin-bottom: 3px; font-size: 12px |
| .combo-qty | font-size: 16px; padding: 4px 12px | font-size: 11px; padding: 2px 8px |
| .combo-details | font-size: 14px | font-size: 10px |
| .customers | font-size: 12px; margin-top: 8px | font-size: 9px; margin-top: 3px |
| .section-fit/fitness h2 | padding: 8px 12px | padding: 4px 8px |

### Arquivo alterado

`src/components/admin/ProductionPanel.tsx` — apenas os estilos inline do `handlePrintAll` (linhas 632-647).
