

# Navegacao mobile com atalhos para cada linha de produto

## Problema atual

A navegacao mobile na pagina principal (`/`) tem apenas 4 itens: **Kits Detox**, **Marmitas**, **Dieta**, **FAQ**. Clicar em "Marmitas" rola para o inicio da secao inteira, sem diferenciar entre Emagrecimento e Hipertrofia.

## O que sera feito

Separar a navegacao mobile em 3 atalhos de produto + os itens existentes:

```text
┌──────────┬──────────────┬──────────────┬───────┬─────┐
│ 🥤 Detox │ 🥗 Emagrecer │ 💪 Massa     │ 🥗 AI │ ❓  │
└──────────┴──────────────┴──────────────┴───────┴─────┘
```

- **Detox** → rola para secao `#kits` (kits detox)
- **Emagrecer** → rola para secao `#marmitas-fit` (marmitas 300g emagrecimento)
- **Massa** → rola para secao `#marmitas-fitness` (marmitas 450g hipertrofia)
- **Dieta** e **FAQ** permanecem

## Detalhes tecnicos

### Arquivo 1: `src/components/MarmitasSection.tsx`

Adicionar IDs nas divs das sub-secoes para que o scroll funcione:

- Na div da secao Emagrecimento (~linha 332): adicionar `id="marmitas-fit"`
- Na div da secao Hipertrofia (~linha 369): adicionar `id="marmitas-fitness"`

### Arquivo 2: `src/components/SideNavigation.tsx`

Atualizar o array `navItems` para incluir os novos destinos:

```
const navItems = [
  { id: "kits", label: "Detox", icon: Droplets },
  { id: "marmitas-fit", label: "Emagrecer", icon: Salad },
  { id: "marmitas-fitness", label: "Massa", icon: Dumbbell },
  { id: "dieta-personalizada", label: "Dieta", icon: Sparkles },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];
```

- Importar `Dumbbell` e `Sparkles` de `lucide-react`
- Remover o antigo item "Marmitas" (UtensilsCrossed) e substituir pelos dois novos
- Ajustar `useActiveSection` que ja recebe os `sectionIds` automaticamente do array

### Arquivo 3: `src/pages/Index.tsx`

Adicionar os novos IDs ao array de secoes observadas pelo `useActiveSection` (se necessario), mas como o `SideNavigation` ja gerencia seu proprio scroll spy internamente, nenhuma mudanca deve ser necessaria aqui.

### Arquivos afetados
- `src/components/MarmitasSection.tsx` (adicionar IDs)
- `src/components/SideNavigation.tsx` (atualizar nav items)

