
# Otimizacoes Mobile para o Modal de Sabores

## Problemas Identificados

1. **Botoes +/- muito pequenos para toque** -- Os botoes de adicionar/remover sabor tem `p-1.5` (~28px), abaixo do minimo recomendado de 44px para touch targets em mobile.

2. **Layout da linha de sabor apertado** -- No mobile, preco + botao minus + contador + botao plus ficam espremidos no lado direito, dificultando o toque preciso.

3. **Modal nao usa tela cheia no mobile** -- O DialogContent usa `max-h-[90vh]` mas nao ocupa a tela toda no mobile, desperdicando espaco e deixando o conteudo apertado.

4. **Botao de confirmar no footer** -- O botao "Selecione mais X marmitas" fica proximo demais da borda inferior, podendo conflitar com a barra de navegacao do celular (safe area).

5. **Scroll longo com muitos sabores** -- O usuario precisa rolar muito para ver todos os sabores sem indicacao visual clara de que ha mais conteudo.

## Plano de Implementacao

### 1. Aumentar touch targets dos botoes +/-
- Mudar botoes de `p-1.5` para `p-2.5` (40px+) no FlavorSelectionModal
- Mudar icones de `w-3.5 h-3.5` para `w-4 h-4`
- Aplicar o mesmo no KitFlavorSelectionModal (botoes de `w-7 h-7` para `w-9 h-9`)

### 2. Modal full-screen no mobile
- Adicionar classes responsivas ao DialogContent do FlavorSelectionModal: no mobile, usar `max-h-[100dvh] h-[100dvh] rounded-none` em vez de `max-h-[90vh]`
- Isso da mais espaco para o conteudo e os botoes

### 3. Safe area no footer
- Adicionar `pb-[env(safe-area-inset-bottom)]` ao footer do modal para evitar que o botao fique atras da barra de navegacao em iPhones com notch

### 4. Melhorar layout da linha de sabor no mobile
- Reorganizar o layout do sabor: preco abaixo do nome (em vez de ao lado dos botoes) no mobile
- Botoes +/- ficam mais separados e faceis de tocar

### 5. KitFlavorSelectionModal - mesmas otimizacoes
- Aumentar touch targets
- Full-screen no mobile
- Safe area no footer

---

### Detalhes Tecnicos

**Arquivos modificados:**
- `src/components/FlavorSelectionModal.tsx` -- touch targets, layout responsivo, safe area
- `src/components/KitFlavorSelectionModal.tsx` -- mesmas otimizacoes

**Mudancas especificas no FlavorSelectionModal:**

Linha 379 (DialogContent):
```
className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col"
```
Para:
```
className="max-w-2xl max-h-[100dvh] sm:max-h-[90vh] h-[100dvh] sm:h-auto p-0 gap-0 flex flex-col sm:rounded-lg rounded-none"
```

Linhas 698-731 (botoes +/-):
- `p-1.5` para `p-2` nos botoes minus e plus
- Icones de `w-3.5 h-3.5` para `w-4 h-4`

Linha 752 (footer):
```
className="p-4 border-t bg-background shrink-0 space-y-3"
```
Para:
```
className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-background shrink-0 space-y-3"
```

**Mudancas no KitFlavorSelectionModal:**

Linha 187 (DialogContent):
- Mesma abordagem full-screen mobile

Botoes (w-7 h-7 para w-9 h-9):
- Icones de `w-3 h-3` para `w-4 h-4`

Footer: safe area inset
