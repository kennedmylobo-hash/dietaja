

## Fluxo de Convite por Email para Donos de Restaurante

### Resumo
Quando um novo restaurante for cadastrado no Super Admin, em vez de definir uma senha temporaria, o sistema enviara um email de convite ao dono do restaurante com um link para ele criar sua propria senha e acessar o painel `/admin`.

### O que muda para o usuario

1. No formulario de onboarding do Super Admin, o campo "Senha Temporaria" sera removido -- basta informar o email do dono
2. O dono recebe um email bonito e personalizado com um botao "Criar minha senha"
3. Ao clicar, ele e levado a uma pagina onde define sua senha
4. Apos definir, e redirecionado automaticamente ao painel `/admin` do seu restaurante

### Etapas de Implementacao

**1. Adicionar `tenant_id` a tabela `user_roles`**

Migracao SQL para:
- Adicionar coluna `tenant_id` (UUID, referencia `tenants.id`) na tabela `user_roles`
- Atualizar os registros existentes de admin para vincular ao tenant correto (via `profiles.tenant_id`)
- Criar indice para consultas rapidas

**2. Criar Edge Function `send-tenant-invite`**

Nova funcao backend que:
- Recebe `email`, `tenant_id`, `brand_name`
- Gera um link de convite via `supabase.auth.admin.generateLink({ type: "invite" })`
- Envia email estilizado via Resend com branding do restaurante (nome, cor)
- O link redireciona para `/admin/reset-password` (pagina ja existente para definir senha)

**3. Atualizar Edge Function `create-tenant`**

Modificacoes:
- Remover o parametro `admin_password` (nao sera mais necessario)
- Criar o usuario com senha aleatoria (usuario nunca a usa)
- Inserir `tenant_id` na tabela `user_roles` junto com o role `admin`
- Chamar internamente a logica de envio de convite por email

**4. Atualizar Formulario de Onboarding (SAOnboarding.tsx)**

- Remover campo "Senha Temporaria"
- Atualizar mensagem de sucesso: "Convite enviado para o email do admin"
- Ajustar validacao do formulario

**5. Atualizar Verificacao de Login no `/admin` (Admin.tsx)**

- Ao verificar o role `admin`, tambem carregar o `tenant_id` do `user_roles`
- Armazenar o `tenant_id` no contexto para filtrar dados corretamente
- Isso garante que cada admin so veja dados do seu restaurante

### Detalhes Tecnicos

```text
Fluxo do Convite:

Super Admin preenche formulario
        |
        v
create-tenant (Edge Function)
  - Cria usuario (senha aleatoria)
  - Cria tenant
  - Insere user_roles com tenant_id
  - Gera link de convite
  - Envia email via Resend
        |
        v
Dono recebe email com link
        |
        v
/admin/reset-password (pagina existente)
  - Define senha
  - Redireciona para /admin
        |
        v
/admin (login normal com email + senha)
  - Valida role admin + tenant_id
  - Filtra dados pelo tenant_id
```

**Migracao SQL:**
```sql
ALTER TABLE public.user_roles
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- Vincular admins existentes ao tenant correto
UPDATE public.user_roles ur
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.role = 'admin'
  AND ur.tenant_id IS NULL;

CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
```

**Arquivos modificados:**
- `supabase/functions/create-tenant/index.ts` -- remover senha, adicionar tenant_id ao role, enviar convite
- `supabase/functions/send-tenant-invite/index.ts` -- nova funcao para email de convite
- `src/components/super-admin/SAOnboarding.tsx` -- remover campo senha
- `src/pages/Admin.tsx` -- carregar tenant_id do user_roles apos login
- Migracao SQL para `user_roles.tenant_id`

