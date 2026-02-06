

# Plano: Corrigir Quantidades de Sucos e Sopas nos Kits Detox

## Problema Identificado

A página `/detox` está calculando as quantidades de sucos e sopas de forma **incorreta**:

| Kit | Atual (Errado) | Correto (4 sucos + 2 sopas/dia) |
|-----|----------------|--------------------------------|
| 3 dias | 6 sucos + 3 sopas | **12 sucos + 6 sopas** |
| 5 dias | 10 sucos + 5 sopas | **20 sucos + 10 sopas** |
| 7 dias | 14 sucos + 7 sopas | **28 sucos + 14 sopas** |

A imagem do modal mostra "Sucos: 6 de 6" e "Sopas: 0 de 3" para o Kit 3 Dias, quando deveria ser "Sucos: 0 de 12" e "Sopas: 0 de 6".

## Arquivos Afetados

| Arquivo | Problema | Ação |
|---------|----------|------|
| `src/pages/Detox.tsx` | Linha 90-91: `juices: days * 2, soups: days` | Corrigir para `days * 4` e `days * 2` |
| `src/components/CartDrawer.tsx` | Já correto: `juices: days * 4, soups: days * 2` | Nenhuma |
| `src/components/KitsSection.tsx` | Já correto: `juices: days * 4, soups: days * 2` | Nenhuma |

## Correção

Apenas 1 arquivo precisa ser alterado:

**`src/pages/Detox.tsx`** (linhas 86-93):

```typescript
// ANTES (incorreto)
const getKitQuantities = (days: number) => {
  // 3 days = 6 juices + 3 soups...
  return {
    juices: days * 2,
    soups: days,
  };
};

// DEPOIS (correto)
const getKitQuantities = (days: number) => ({
  juices: days * 4,  // 4 sucos por dia
  soups: days * 2,   // 2 sopas por dia
});
```

## Resultado Esperado

Após a correção, os kits terão:
- **Kit 3 Dias:** 12 sucos + 6 sopas
- **Kit 5 Dias:** 20 sucos + 10 sopas
- **Kit 7 Dias:** 28 sucos + 14 sopas

O modal de seleção de sabores exibirá as quantidades corretas, alinhadas com o comportamento já existente no `CartDrawer` e `KitsSection`.

