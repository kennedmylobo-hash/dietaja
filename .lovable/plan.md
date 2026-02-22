

# Corrigir Acesso ao Painel Admin

## Problema
As politicas de seguranca (RLS) na tabela `user_roles` estao configuradas como **restritivas** (RESTRICTIVE). O PostgreSQL exige pelo menos uma politica **permissiva** (PERMISSIVE) para liberar acesso. Como ambas sao restritivas, nenhuma linha e retornada, fazendo o sistema achar que o usuario nao tem permissao.

Seu usuario kennedmylobo@gmail.com tem as roles `admin` e `super_admin` corretamente cadastradas -- o problema e apenas que a consulta nao consegue le-las.

## Solucao
Recriar as politicas da tabela `user_roles` como **permissivas** (que e o padrao do PostgreSQL):

1. Remover as duas politicas atuais (restritivas)
2. Criar duas novas politicas permissivas:
   - **"Users can view their own roles"** (SELECT) -- usuarios podem ver suas proprias roles (`user_id = auth.uid()`)
   - **"Admins can manage all roles"** (ALL) -- admins podem gerenciar todas as roles (`has_role(auth.uid(), 'admin')`)

## Detalhes Tecnicos

**Migracao SQL:**
```sql
-- Remover politicas restritivas existentes
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Recriar como PERMISSIVE (padrao)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
```

**Nenhuma alteracao de codigo e necessaria** -- o problema e exclusivamente na configuracao do banco de dados.

Apos aplicar, o login no `/admin` e no `/super-admin` funcionara normalmente.
