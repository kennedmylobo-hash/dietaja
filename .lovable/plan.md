

# Plano: Centralizar Cards de Pacotes (3 unidades)

## Problema Atual

O grid de pacotes usa `lg:grid-cols-4`, então com apenas 3 kits, os cards ficam alinhados à esquerda com um espaço vazio à direita.

## Solução

Modificar o componente `PackageCards` para adaptar o grid dinamicamente:

| Quantidade | Layout Desktop | Comportamento |
|------------|----------------|---------------|
| 3 itens | `lg:grid-cols-3` | Cards centralizados, ocupando todo espaço |
| 4+ itens | `lg:grid-cols-4` | Mantém layout atual |

## Alteração Técnica

**Arquivo:** `src/components/landing/PackageCards.tsx`

**Antes (linha 75):**
```tsx
<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Depois:**
```tsx
<div className={`grid sm:grid-cols-2 gap-4 ${
  packages.length === 3 
    ? 'lg:grid-cols-3 max-w-4xl mx-auto' 
    : 'lg:grid-cols-4'
}`}>
```

## Resultado Visual

```text
ANTES (3 cards em grid de 4):
┌─────┐ ┌─────┐ ┌─────┐ [vazio]
│ Kit │ │ Kit │ │ Kit │
│  3  │ │  5  │ │  7  │
└─────┘ └─────┘ └─────┘

DEPOIS (3 cards centralizados):
     ┌─────┐ ┌─────┐ ┌─────┐
     │ Kit │ │ Kit │ │ Kit │
     │  3  │ │  5  │ │  7  │
     └─────┘ └─────┘ └─────┘
```

## Benefícios

- Layout mais equilibrado e profissional
- Reutilizável: funciona para 3 ou 4+ pacotes automaticamente
- Responsivo: mobile continua com 2 colunas

