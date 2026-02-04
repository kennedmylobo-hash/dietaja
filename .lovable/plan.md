
# Plano: Botão "Esqueci Minha Senha" no Admin

## Visão Geral

Adicionar funcionalidade completa de recuperação de senha na tela de login do Admin, incluindo:
- Botão "Esqueci minha senha" 
- Envio de email com link de recuperação via Resend
- Tela para redefinir a senha

---

## Fluxo do Usuário

```text
┌─────────────────────────────────────────────────────────────────┐
│                    TELA DE LOGIN                                │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │  Email: [_________________________________]            │    │
│   │  Senha: [_________________________________]            │    │
│   │                                                        │    │
│   │  [        ENTRAR        ]                             │    │
│   │                                                        │    │
│   │  Esqueci minha senha    │    Não tem conta?           │    │
│   └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼ Clica "Esqueci minha senha"
┌─────────────────────────────────────────────────────────────────┐
│                    RECUPERAR SENHA                              │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │  Digite seu email para receber o link de recuperação  │    │
│   │                                                        │    │
│   │  Email: [_________________________________]            │    │
│   │                                                        │    │
│   │  [    ENVIAR LINK DE RECUPERAÇÃO    ]                 │    │
│   │                                                        │    │
│   │  ← Voltar para login                                  │    │
│   └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼ Email enviado
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL ENVIADO                                │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │           ✓ Email enviado com sucesso!                │    │
│   │                                                        │    │
│   │   Verifique sua caixa de entrada e spam.              │    │
│   │   O link expira em 1 hora.                            │    │
│   │                                                        │    │
│   │  [    VOLTAR PARA LOGIN    ]                          │    │
│   └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼ Clica no link do email
┌─────────────────────────────────────────────────────────────────┐
│                    NOVA SENHA                                   │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │  Digite sua nova senha                                 │    │
│   │                                                        │    │
│   │  Nova Senha: [______________________________]          │    │
│   │  Confirmar:  [______________________________]          │    │
│   │                                                        │    │
│   │  [        REDEFINIR SENHA        ]                    │    │
│   └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alteracoes Tecnicas

### 1. Nova Rota para Reset de Senha

| Arquivo | Acao |
|---------|------|
| `src/App.tsx` | Adicionar rota `/admin/reset-password` |
| `src/pages/AdminResetPassword.tsx` | CRIAR nova pagina |

### 2. Modificar Tela de Login

| Arquivo | Acao |
|---------|------|
| `src/pages/Admin.tsx` | Adicionar estado e UI para recuperacao de senha |

### 3. Nova Edge Function

| Arquivo | Acao |
|---------|------|
| `supabase/functions/send-password-reset/index.ts` | CRIAR funcao para enviar email |

---

## Detalhes de Implementacao

### Edge Function: send-password-reset

```typescript
// Recebe email do usuario
// Usa supabase.auth.resetPasswordForEmail() para gerar token
// Envia email personalizado via Resend com link para /admin/reset-password
```

**Email enviado tera:**
- Logo do Dieta Ja
- Botao "Redefinir Senha" com link
- Aviso de expiracao (1 hora)
- Contato de suporte

### Pagina AdminResetPassword

- Detecta token na URL (parametro `code` do Supabase)
- Formulario com nova senha e confirmacao
- Validacao: minimo 6 caracteres, senhas devem coincidir
- Chama `supabase.auth.updateUser({ password })` para atualizar
- Redireciona para `/admin` apos sucesso

### Modificacoes no Admin.tsx

Adicionar novo estado:
```typescript
const [showForgotPassword, setShowForgotPassword] = useState(false);
const [resetEmailSent, setResetEmailSent] = useState(false);
```

Adicionar funcao:
```typescript
const handleForgotPassword = async () => {
  // Chama edge function send-password-reset
  // Mostra confirmacao de email enviado
};
```

Adicionar UI:
- Link "Esqueci minha senha" abaixo do botao Entrar
- Tela condicional para inserir email de recuperacao
- Tela de confirmacao apos envio

---

## Configuracao do Supabase

O Supabase tem configuracao nativa de redirect URL para reset de senha. 
O link enviado tera formato:
```
https://diet-on-demand.lovable.app/admin/reset-password#access_token=...
```

---

## Seguranca

- Nao revelar se email existe ou nao (mensagem generica)
- Token expira em 1 hora
- Validacao de senha forte (minimo 6 caracteres)
- Rate limiting no edge function (futuro)

---

## Resultado Esperado

1. Usuario clica "Esqueci minha senha" na tela de login
2. Digita seu email e clica enviar
3. Recebe email com design do Dieta Ja e link
4. Clica no link e abre pagina para definir nova senha
5. Define nova senha e faz login normalmente
