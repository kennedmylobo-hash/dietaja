
# Adicionar opcao "IA monta pra voce" no Modal de Sabores

## O que sera feito

Adicionar uma segunda opcao entre "Deixar a cargo da casa" e a selecao manual no FlavorSelectionModal, que redireciona o usuario para a pagina `/monte-seu-cardapio` com a linha (fit/fitness) pre-selecionada.

## Layout no modal

```text
┌─────────────────────────────────────────────┐
│  🍽️ Deixar a cargo da casa        ⭐ RECOMENDADO │
│  Montamos um mix variado com nossos sabores │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ✨ Diga o que gosta e montamos pra voce    │
│  Liste seus ingredientes preferidos e a IA  │
│  monta seu cardapio ideal                   │
└─────────────────────────────────────────────┘

          ──── ou escolha manualmente ────

  Carnes (15)
  ...
```

## Detalhes tecnicos

### Arquivo: `src/components/FlavorSelectionModal.tsx`

1. Importar `Link` de `react-router-dom`
2. O componente recebe `lineType` como prop (ja existente: `'emagrecimento'` ou `'hipertrofia'`)
3. Apos o bloco "Deixar a cargo da casa" (linha ~403) e antes do divider (linha ~406), adicionar um novo bloco:

```text
<Link to={`/monte-seu-cardapio?linha=${lineType}`} className="block">
  <motion.div className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 hover:border-purple-400 cursor-pointer transition-all">
    <Sparkles className="w-5 h-5 text-purple-500" />
    <div>
      <span className="font-semibold text-foreground">
        Liste o que gosta e montamos pra voce
      </span>
      <p className="text-sm text-muted-foreground">
        Diga seus ingredientes preferidos e a IA monta seu cardapio
      </p>
    </div>
  </motion.div>
</Link>
```

### Comportamento

- Ao clicar, o modal fecha e o usuario e redirecionado para `/monte-seu-cardapio?linha=emagrecimento` ou `/monte-seu-cardapio?linha=hipertrofia`
- A pagina Monte Seu Cardapio ja sabe lidar com a linha selecionada
- Nao altera nenhuma outra funcionalidade do modal

### Arquivo afetado

Apenas `src/components/FlavorSelectionModal.tsx`
