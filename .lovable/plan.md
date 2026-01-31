
## Problema Identificado: Abas Sumindo no Painel Admin

### Diagnóstico
O código do Admin.tsx contém **11 abas**, mas na sua tela só aparecem **8**. Estão faltando:
- **Ao Vivo** (primeira aba)
- **Notificações**
- **Erros PIX**

O problema é que o grid usa `grid-cols-11` fixo, que não se adapta bem a telas menores. Isso causa overflow horizontal e algumas abas ficam invisíveis.

### Causa Técnica
```tsx
// Linha 647 do Admin.tsx
<TabsList className="grid w-full max-w-7xl grid-cols-11">
```

Com 11 colunas fixas, em telas menores que ~1400px, as abas começam a ficar muito comprimidas ou cortadas.

### Solução Proposta

**Modificar o TabsList para usar layout responsivo:**

```tsx
<TabsList className="flex flex-wrap gap-1 w-full max-w-7xl">
```

Ou usar scroll horizontal:

```tsx
<TabsList className="flex overflow-x-auto w-full max-w-7xl gap-1">
```

Isso permite que:
1. Todas as 11 abas fiquem visíveis
2. Em telas menores, haja scroll horizontal
3. A aba "Ao Vivo" (com indicador pulsante verde) volte a aparecer

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Admin.tsx` | Trocar grid fixo por flex com overflow-x-auto |

### Impacto Visual
- As abas poderão fazer scroll horizontal em telas menores
- Todas as 11 abas ficarão acessíveis
- O indicador pulsante do "Ao Vivo" voltará a aparecer
