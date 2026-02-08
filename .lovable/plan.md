

## Substituir "mix de salada" por "mix de legumes" no texto exibido

### Problema

O parser ja normaliza internamente para matching, mas o `item.name` preserva o texto bruto do WhatsApp. Quando o cliente escreve "mix de salada", isso aparece igual na tela. O correto e sempre exibir "mix de legumes" porque sao o mesmo prato.

### Solucao

No `WhatsAppOrderImporter.tsx`, logo apos o parsing (linha 178), aplicar um `.map()` nos items para substituir "mix de salada" por "mix de legumes" no campo `name`:

```
setItems(result.items.map(item => ({
  ...item,
  name: item.name.replace(/mix de salada/gi, 'mix de legumes'),
})));
```

Isso garante que em toda a interface (lista de itens, resumo, pedido salvo) apareca "mix de legumes".

### Arquivo alterado

| Arquivo | Mudanca |
|---|---|
| `src/components/admin/WhatsAppOrderImporter.tsx` | Linha 178: normalizar `item.name` substituindo "mix de salada" por "mix de legumes" ao popular os itens apos o parsing |

