

## Corrigir Fluxo de Onboarding: Admin ve Painel do Proprio Restaurante

### Problema Atual
Quando um novo dono de restaurante acessa `/admin`, o sistema identifica o tenant pelo dominio (hostname). Como o dominio atual e `pedidos.dietajavca.com.br`, o TenantContext sempre resolve para o Dieta Ja -- mesmo que o admin pertenca a outro restaurante.

### Solucao
Fazer o TenantContext detectar que o usuario logado e admin de um tenant especifico (via `user_roles.tenant_id`) e usar esse tenant em vez do hostname.

### Mudancas

**1. TenantContext.tsx -- Priorizar tenant do admin logado**

Apos a deteccao por hostname, verificar se ha sessao autenticada. Se o usuario tem role `admin` com `tenant_id` na tabela `user_roles`, carregar o tenant correspondente e sobrescrever o que veio do hostname.

Fluxo atualizado:

```text
TenantContext carrega
  |
  v
Detecta tenant por hostname/query param (como hoje)
  |
  v
Verifica se ha sessao autenticada
  |-- Nao: usa tenant do hostname (comportamento atual para clientes)
  |-- Sim: busca user_roles do usuario
       |
       v
       Tem role admin com tenant_id?
         |-- Sim: carrega esse tenant e sobrescreve
         |-- Nao: mantem tenant do hostname
```

**2. send-tenant-invite -- Corrigir URL de redirecionamento**

O `redirectTo` esta fixo em `pedidos.dietajavca.com.br`. Precisa apontar para o dominio correto do novo tenant (ou usar o dominio da plataforma com `?tenant=slug`).

Alterar para montar a URL dinamicamente:
- Se o tenant tem `domain` configurado: usar `https://{domain}/admin/reset-password`
- Senao: usar `https://{slug}.suaplataforma.com.br/admin/reset-password`
- Fallback com query param: adicionar `?tenant={slug}` na URL para garantir resolucao correta

**3. Admin.tsx -- Limpar redirect apos set password**

Garantir que apos definir a senha, o redirect vai para `/admin` no dominio correto (o TenantContext ja vai resolver corretamente com a mudanca #1).

### Arquivos Modificados

- `src/contexts/TenantContext.tsx` -- Adicionar logica de override por admin role
- `supabase/functions/send-tenant-invite/index.ts` -- URL dinamica com slug do tenant
- `supabase/functions/create-tenant/index.ts` -- Passar slug para o send-tenant-invite

### Sobre o Email nao Chegando

O Resend reporta envio com sucesso, mas o email pode estar sendo filtrado. Duas acoes:
- Verificar se o dominio `dietajavca.com.br` esta verificado no Resend para envio
- Como workaround imediato, o link de convite sera logado no console do Edge Function para que voce possa copiar e enviar manualmente enquanto resolve a entrega do email

