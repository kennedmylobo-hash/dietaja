

# Filtro de Nomes Ofensivos

## Problema
Um cliente digitou "piroquinha" como nome e isso foi salvo no pedido e usado em mensagens automaticas (WhatsApp, e-mail). Nao ha nenhuma validacao de conteudo ofensivo nos campos de nome.

## Solucao

Criar uma funcao utilitaria centralizada que sanitiza nomes, e aplica-la em todos os pontos onde o nome do cliente e capturado.

### 1. Criar `src/lib/name-sanitizer.ts`

Funcao `sanitizeCustomerName(input: string): string` que:

- Remove acentos e normaliza o texto para comparacao (sem alterar o nome final se for valido)
- Substitui caracteres comuns de "leet speak" (0→o, 1→i, 4→a, 3→e, @→a, !→i, etc.)
- Compara contra uma lista de termos proibidos em portugues (palavroes, termos sexuais, ofensivos)
- Se qualquer termo proibido for encontrado no nome normalizado, retorna "Cliente"
- Se o nome estiver vazio, conter apenas simbolos/numeros, ou tiver menos de 2 letras, retorna "Cliente"
- Permite apenas letras (incluindo acentos), espacos e hifens no nome final

Lista de termos incluira categorias:
- Termos sexuais/anatomicos (piroca, pinto, rola, buceta, etc.)
- Palavroes gerais (porra, merda, caralho, foda, etc.)
- Xingamentos (viado, puta, corno, etc.)
- Variantes parciais para capturar derivados (piroquinha, putinha, etc.)

A funcao tambem exportara `getOriginalNameForLog(sanitized, original)` que retorna o nome original apenas para uso em logs administrativos.

### 2. Aplicar nos 3 pontos de entrada de nome

**`src/components/CartDrawer.tsx`** - Na funcao `handleGoToConfirmation`:
- Sanitizar `data.name` antes de setar no `formData`

**`src/components/CheckoutForm.tsx`** - Na funcao `onSubmit`:
- Sanitizar `data.name` antes de usar

**`src/components/SoftIdentificationModal.tsx`** - Na funcao `validateAndSubmit`:
- Sanitizar `name` antes de chamar `onConfirm`

### 3. Comportamento
- Substituicao silenciosa, sem erro visivel ao usuario
- O nome "Cliente" e usado em todas as automacoes (WhatsApp, e-mail, Asaas)
- Log do nome original fica disponivel apenas no console para auditoria admin

## Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/lib/name-sanitizer.ts` | **Novo** - Funcao de sanitizacao com lista de termos |
| `src/components/CartDrawer.tsx` | Importar e aplicar `sanitizeCustomerName` |
| `src/components/CheckoutForm.tsx` | Importar e aplicar `sanitizeCustomerName` |
| `src/components/SoftIdentificationModal.tsx` | Importar e aplicar `sanitizeCustomerName` |

## Exemplo da funcao

```typescript
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a',
  '5': 's', '7': 't', '@': 'a', '!': 'i',
  '$': 's',
};

const BLOCKED_TERMS = [
  'piroc', 'pirok', 'pint', 'rola', 'bucet', 'buset',
  'caralh', 'porra', 'merda', 'fod', 'viado',
  'viada', 'puta', 'corno', 'cacet', 'cu ',
  'arromb', 'desgraç', 'bagulh', // etc.
];

export function sanitizeCustomerName(input: string): string {
  if (!input || !input.trim()) return 'Cliente';

  const cleaned = input.trim();
  // Remove accents + apply leet map for comparison only
  const normalized = removeDiacritics(cleaned)
    .toLowerCase()
    .split('')
    .map(c => LEET_MAP[c] || c)
    .join('')
    .replace(/[^a-z]/g, '');

  if (normalized.length < 2) return 'Cliente';

  for (const term of BLOCKED_TERMS) {
    if (normalized.includes(term)) {
      console.warn('[name-sanitizer] Blocked:', cleaned);
      return 'Cliente';
    }
  }

  // Only allow letters, spaces, hyphens, accents
  if (!/^[\p{L}\s'-]+$/u.test(cleaned)) return 'Cliente';

  return cleaned;
}
```

## Resultado
- "piroquinha" → "Cliente"
- "cacetinho" → "Cliente"
- "p1r0c4" → "Cliente"
- "Carlos Silva" → "Carlos Silva"
- "" → "Cliente"
- "!!@@##" → "Cliente"
