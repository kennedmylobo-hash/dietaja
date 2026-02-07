
## Adicionar "Link da Sua Loja" no TenantSettingsEditor

### O que sera feito

Adicionar um bloco destacado no topo do card "Dados do Restaurante" mostrando o link publico da loja do restaurante, com botao de copiar. Esse link e read-only (nao editavel) e calculado automaticamente.

### Logica do link

```
Se tenant.domain existe -> https://{domain}
Senao                   -> https://diet-on-demand.lovable.app?tenant={slug}
```

Tudo acessado por esse link sera 100% isolado: branding, pixel, analytics, cardapio, checkout -- tudo do tenant.

### Visual

Um bloco com fundo verde claro no topo do card contendo:
- Icone de link
- Label "Link da sua loja"
- URL exibida em texto (read-only, nao editavel)
- Botao "Copiar" com feedback visual (troca para "Copiado!" por 2 segundos)
- Texto: "Compartilhe este link com seus clientes"

### Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/admin/TenantSettingsEditor.tsx` | Importa `Link2, Copy, Check` do lucide-react. Adiciona estado `copied`. Calcula `publicUrl` a partir de `tenant.domain` e `tenant.slug`. Insere bloco visual antes do grid de campos existente. |

### Detalhes tecnicos

- Usa `navigator.clipboard.writeText()` para copiar
- Estado `copied` com `setTimeout` de 2s para feedback
- Nenhuma mudanca no banco de dados
- Os campos `domain` e `slug` ja existem no objeto `tenant` retornado pela query
