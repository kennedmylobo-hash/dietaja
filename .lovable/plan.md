
# Corrigir Login Admin Definitivamente

## Problema
O login no `/admin` e `/super-admin` consulta a tabela `user_roles` diretamente. Essa consulta depende das politicas RLS estarem configuradas corretamente E do token de autenticacao estar sincronizado com o servidor no momento exato da query. Qualquer falha de timing faz o sistema achar que voce nao tem permissao.

Mesmo com retry (5 tentativas), o problema persiste porque a query via RLS pode falhar silenciosamente (retorna array vazio em vez de erro).

## Solucao
Trocar TODAS as verificacoes de role para usar a funcao `has_role()` via RPC. Essa funcao ja existe no banco de dados e usa `SECURITY DEFINER`, o que significa que ela **ignora completamente o RLS** e consulta a tabela diretamente. Isso elimina 100% dos problemas de timing e politicas.

## Mudancas

### Arquivo 1: `src/pages/Admin.tsx`

**Verificacao na restauracao de sessao (linhas 122-158):**
- Remover o loop de retry com 5 tentativas
- Substituir a query `supabase.from('user_roles').select(...)` por duas chamadas RPC:
  - `supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' })`
  - `supabase.rpc('has_role', { _user_id: session.user.id, _role: 'super_admin' })`
- Se qualquer uma retornar `true`, o usuario e autenticado

**Verificacao no login (linhas 426-439):**
- Mesma substituicao: trocar query direta por `has_role` via RPC
- Remover o loop de retry (nao sera mais necessario)

### Arquivo 2: `src/pages/SuperAdmin.tsx`

**Verificacao na restauracao de sessao (linhas 36-51):**
- Substituir `supabase.from('user_roles').select(...)` por RPC `has_role`

**Verificacao no login (linhas 64-73):**
- Substituir `supabase.from('user_roles').select(...)` por RPC `has_role`

## Detalhes Tecnicos

O codigo atual:
```typescript
const { data: roles } = await supabase
  .from('user_roles')
  .select('role, tenant_id')
  .eq('user_id', session.user.id);
const isAdmin = roles?.find(r => r.role === 'admin');
```

Sera substituido por:
```typescript
const { data: isAdmin } = await supabase.rpc('has_role', {
  _user_id: session.user.id,
  _role: 'admin'
});
const { data: isSuperAdmin } = await supabase.rpc('has_role', {
  _user_id: session.user.id,
  _role: 'super_admin'
});
const hasAccess = isAdmin === true || isSuperAdmin === true;
```

**Por que isso resolve definitivamente:**
- `has_role` e `SECURITY DEFINER` -- executa com privilegios do dono da funcao, sem passar pelo RLS
- Nao depende de timing do token
- Nao precisa de retry
- Funciona imediatamente apos o login
- Impossivel falhar por configuracao de politicas
