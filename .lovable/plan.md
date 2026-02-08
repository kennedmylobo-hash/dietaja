
## Reorganizar Lista de Producao para a Cozinheira

Hoje a lista da cozinha mostra apenas 2 grupos: "Proteinas" e "Acompanhamentos". A cozinheira precisa de uma separacao mais clara em 3 categorias para facilitar a montagem.

### O que muda

| Antes | Depois |
|---|---|
| PROTEINAS (tudo junto) | PROTEINAS (carne moida, frango, almondegas...) |
| ACOMPANHAMENTOS (tudo misturado) | CARBOIDRATOS (arroz, aipim, batata doce, pure, feijao, graos...) |
| | SALADA (mix de legumes, mix de salada, legumes, brocolis, vagem...) |

A ordem na impressao e tela sera sempre: **PROTEINAS -> CARBOIDRATOS -> SALADA**, facilitando o fluxo da cozinha.

### Classificacao dos ingredientes

Com base nos dados reais do cardapio:

- **PROTEINAS**: Carne moida, Carne bovina, Almondegas, Frango, Peixe, Lombo, etc. (primeiro ingrediente de cada sabor)
- **CARBOIDRATOS**: Arroz, Aipim, Batata doce, Pure, Feijao, Graos, Arroz do risoto, Macarrao, Nhoque
- **SALADA**: Mix de legumes, Mix de salada, Legumes, Salada de legumes, Brocolis, Vagem, e qualquer vegetal/verdura

### Onde muda

Arquivo unico: `src/components/admin/ProductionPanel.tsx`

**1. Tipo `IngredientTotal`**
Mudar o campo `type` de `'protein' | 'side'` para `'protein' | 'carb' | 'salad'`

**2. Funcao de classificacao de ingrediente**
Nova funcao `classifyIngredient(name)` que retorna `'carb'` ou `'salad'` baseado no nome:
- Palavras-chave para carboidrato: arroz, aipim, batata, pure, feijao, graos, macarrao, nhoque, mandioca, farinha
- Tudo que nao for carboidrato vai para salada (mix, legumes, salada, brocolis, vagem, etc.)

**3. Calculo de producao (useMemo)**
Onde hoje salva `type: 'side'`, passar a usar `classifyIngredient(side.name)` para determinar se eh `'carb'` ou `'salad'`

**4. Tela (cards na aba Producao)**
- Card "Proteinas" (mantém igual, cor amber)
- Card "Carboidratos" (nova cor azul, emoji arroz)
- Card "Salada" (nova cor verde, emoji salada)

**5. Impressao (`handlePrintProduction`)**
Trocar a secao "Acompanhamentos" por duas secoes separadas: "CARBOIDRATOS" e "SALADA"

**6. WhatsApp (`handleShareProduction`)**
Mesmo ajuste: separar em 3 categorias no texto formatado

**7. Impressao da montagem (`handlePrintAssembly`) e WhatsApp montagem (`handleShareAssembly`)**
Na composicao de cada marmita, mostrar os ingredientes na ordem: proteina primeiro, depois carboidrato, depois salada — para a cozinheira ler de forma logica.

### Resultado visual (impressao)

```text
LISTA DE PRODUCAO - COZINHA
08/02/2026 - 15 marmitas

PROTEINAS
  Carne moida .............. 1.5kg
  Carne bovina ............. 600g
  Frango ................... 800g

CARBOIDRATOS
  Arroz .................... 2kg
  Aipim .................... 600g
  Feijao ................... 400g

SALADA
  Mix de legumes ........... 800g
  Legumes .................. 300g
```

### Nenhum arquivo novo. Nenhuma mudanca no banco de dados.
