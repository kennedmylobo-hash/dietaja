

# Melhorias e Problemas Identificados

## 1. BUG: Parametro `?linha=` nao e lido (CRITICO)

Quando o usuario clica em "Liste o que gosta e montamos pra voce" no FlavorSelectionModal, ele e redirecionado para `/monte-seu-cardapio?linha=hipertrofia` (ou emagrecimento), mas a pagina **ignora esse parametro**. O `selectedLine` sempre inicia como `"emagrecimento"`.

**Correcao**: No `MonteSeuCardapioContent`, ler `useSearchParams()` e usar o valor de `linha` como estado inicial do `selectedLine`.

```
const [searchParams] = useSearchParams();
const initialLine = searchParams.get("linha") === "hipertrofia" ? "hipertrofia" : "emagrecimento";
const [selectedLine, setSelectedLine] = useState<LineType>(initialLine);
```

---

## 2. BUG: Modal nao fecha ao clicar na opcao IA

O `Link` no FlavorSelectionModal redireciona, mas o modal continua aberto em background. Isso pode causar estado inconsistente quando o usuario voltar.

**Correcao**: Envolver o clique com `onClose()` antes da navegacao. Trocar `Link` por `useNavigate` com chamada manual:

```
const navigate = useNavigate();

<motion.div onClick={() => { onClose(); navigate(`/monte-seu-cardapio?linha=...`); }}>
```

---

## 3. MELHORIA: Feedback visual de "dark mode" na opcao IA

A opcao IA usa cores fixas (`bg-purple-50`, `border-purple-300`) que podem ficar estranhas em dark mode. Usar variaveis do tema para melhor compatibilidade.

---

## 4. MELHORIA: Scroll para a selecao de linha quando vem do modal

Quando o usuario vem do modal, os campos de ingredientes estarao vazios. Seria mais intuitivo o scroll comecar direto na area de voz/ingredientes em vez do topo, ja que o usuario ja sabe qual linha quer.

---

## Resumo das alteracoes

### Arquivo: `src/pages/MonteSeuCardapio.tsx`
- Importar `useSearchParams` de `react-router-dom`
- Ler `?linha=` e usar como estado inicial de `selectedLine`

### Arquivo: `src/components/FlavorSelectionModal.tsx`
- Trocar `Link` por `useNavigate`
- Chamar `onClose()` antes de navegar
- Ajustar cores para compatibilidade com dark mode (usar `bg-purple-50 dark:bg-purple-950/30` etc.)

### Arquivos afetados
- `src/components/FlavorSelectionModal.tsx`
- `src/pages/MonteSeuCardapio.tsx`
