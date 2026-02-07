

## Atualizar URLs da Plataforma para "PedidoJá"

### Contexto
O software SaaS terá seu proprio dominio (por enquanto `pedidoja`). Todos os links de acesso ao painel administrativo devem apontar para o dominio da plataforma, nao para o dominio de nenhum restaurante individual. Hoje, 3 Edge Functions tem URLs fixas apontando para `pedidos.dietajavca.com.br`.

### Mudancas

**1. Criar constante do dominio da plataforma**

Definir uma variavel `PLATFORM_DOMAIN` nas Edge Functions que precisam gerar links. Por enquanto, como o dominio final ainda nao esta configurado, usar a URL publicada do projeto Lovable (`diet-on-demand.lovable.app`) como valor temporario. Quando o dominio `pedidoja.com.br` (ou outro) for conectado, basta atualizar esse valor.

**2. `send-tenant-invite/index.ts` -- Atualizar redirectTo**

Trocar:
```
https://pedidos.dietajavca.com.br/admin/reset-password?tenant=...
```
Por:
```
https://diet-on-demand.lovable.app/admin/reset-password?tenant={slug}
```

O link sempre usa o dominio da plataforma + `?tenant=slug` para garantir que o TenantContext resolva corretamente.

**3. `send-password-reset/index.ts` -- Atualizar redirectTo e branding**

Trocar URL fixa `pedidos.dietajavca.com.br` pelo dominio da plataforma. Tambem tornar o branding dinamico (buscar dados do tenant do admin que solicitou o reset), ao inves de fixo "Dieta Ja".

**4. `send-tenant-invite/index.ts` -- Atualizar remetente do email**

Trocar o `from` fixo `pedidos@dietajavca.com.br` por um remetente da plataforma (ex: `noreply@pedidoja.com.br` ou manter `pedidos@dietajavca.com.br` temporariamente enquanto o dominio novo nao esta verificado no Resend).

### Arquivos Modificados

| Arquivo | O que muda |
|---|---|
| `supabase/functions/send-tenant-invite/index.ts` | redirectTo aponta para dominio da plataforma com `?tenant=slug` |
| `supabase/functions/send-password-reset/index.ts` | redirectTo dinamico, busca tenant do admin, branding personalizado |

### Notas Tecnicas

- O `?tenant=slug` no redirect garante que o TenantContext carregue o restaurante correto na tela de reset de senha
- O dominio da plataforma sera `diet-on-demand.lovable.app` ate que um dominio customizado (ex: `pedidoja.com.br`) seja conectado
- A logica de override por admin no TenantContext (ja implementada) garante que apos o login, o admin veja apenas o painel do restaurante dele
