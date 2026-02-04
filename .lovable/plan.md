

# Plano: Corrigir Emojis dos Sucos

## Objetivo

Atualizar os emojis dos sucos detox para refletir melhor o ingrediente principal de cada sabor.

---

## Alterações

| Suco | Emoji Atual | Novo Emoji | Ingrediente Principal |
|------|-------------|------------|----------------------|
| Verde | 🥬 couve | 🍍 abacaxi | Abacaxi (mais atrativo) |
| Rosa | 🍉 melancia | 🍉 melancia | Sem alteração (já correto) |
| Amarelo | 🍊 laranja | 🥭 manga | Manga (ingrediente real) |
| Vermelho | 🍅 tomate | 🍓 morango | Morango (ingrediente real) |

---

## Implementação

Será executada uma migração SQL para atualizar a tabela `kit_juices`:

```sql
UPDATE kit_juices SET emoji = '🍍' WHERE name = 'Suco Verde';
UPDATE kit_juices SET emoji = '🥭' WHERE name = 'Suco Amarelo';
UPDATE kit_juices SET emoji = '🍓' WHERE name = 'Suco Vermelho';
```

---

## Resultado Esperado

Após a migração, os sucos aparecerão assim no cardápio:

- 🍍 **Suco Verde** - abacaxi, couve e gengibre
- 🍉 **Suco Rosa** - melancia com hortelã  
- 🥭 **Suco Amarelo** - manga com cenoura
- 🍓 **Suco Vermelho** - morango com hortelã

