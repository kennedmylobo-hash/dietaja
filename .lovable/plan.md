
# Plano: Corrigir Reset de Senha do Admin (Definitivo)

## Problemas Identificados

### Problema 1: Rota 404
A rota `/admin/reset-password` existe no código mas o `vercel.json` com as configurações de SPA routing ainda **não foi publicado** para produção.

### Problema 2: URL Errada no Email
O email de recuperação envia link para `diet-on-demand.lovable.app` mas seu domínio de produção é `pedidos.dietajavca.com.br`.

```typescript
// Linha 46 do send-password-reset/index.ts - PROBLEMA
const redirectTo = "https://diet-on-demand.lovable.app/admin/reset-password";
```

---

## Solução

### 1. Atualizar Edge Function com URL Correta

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-password-reset/index.ts` | Usar domínio de produção correto |

```typescript
// ANTES
const redirectTo = "https://diet-on-demand.lovable.app/admin/reset-password";

// DEPOIS  
const redirectTo = "https://pedidos.dietajavca.com.br/admin/reset-password";
```

### 2. Publicar Tudo

Após a correção, você precisa clicar em **Publish > Update** para:
- Deploy das configurações de SPA routing (vercel.json)
- Deploy da edge function corrigida
- Deploy das landing pages

---

## Por que o 404 aparece atualmente?

```text
Email enviado com link para:
diet-on-demand.lovable.app/admin/reset-password
                           ↓
Servidor da Lovable recebe requisição
                           ↓
Tenta encontrar arquivo /admin/reset-password
                           ↓
Arquivo não existe → vercel.json não publicado
                           ↓
404 Error ❌
```

## Como ficará após correção:

```text
Email enviado com link para:
pedidos.dietajavca.com.br/admin/reset-password
                           ↓
Servidor recebe requisição
                           ↓
vercel.json redireciona para index.html
                           ↓
React Router renderiza AdminResetPassword
                           ↓
Página de redefinição de senha ✅
```

---

## Resultado Esperado

| Item | Status Após Correção |
|------|---------------------|
| Link de recuperação no email | Aponta para domínio correto |
| Página `/admin/reset-password` | Carrega normalmente |
| Landing pages `/fit`, `/fitness`, `/detox` | Funcionando |
| Acesso direto via links | Funcionando |
