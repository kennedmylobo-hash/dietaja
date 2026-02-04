
# Corrigir Erro 404 na Recuperação de Senha

## Diagnóstico

O erro 404 ocorre porque:

1. A edge function `send-password-reset` envia o link apontando para a URL de **produção**: `https://diet-on-demand.lovable.app/admin/reset-password`
2. O código da página `AdminResetPassword.tsx` foi criado, mas ainda **não foi publicado** no ambiente live
3. Por isso, quando você clica no link do email, a versão publicada não reconhece a rota e mostra 404

## Solução

### Opcao 1: Publicar o Projeto (Recomendada)

Publicar o projeto atual para que a página `/admin/reset-password` fique disponível na URL de produção.

**Passos:**
- Clicar no botão "Publish" no canto superior direito do Lovable
- Aguardar a publicação completar
- Testar novamente o fluxo de recuperação de senha

### Opcao 2: Atualizar Edge Function para Ambiente de Preview

Se quiser testar antes de publicar, podemos atualizar a edge function para detectar o ambiente e usar a URL correta:

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/send-password-reset/index.ts` | Usar URL do preview para testes |

**Mudanca necessaria:**
```typescript
// Linha 46 - Alterar de:
const redirectTo = "https://diet-on-demand.lovable.app/admin/reset-password";

// Para detectar ambiente ou usar preview:
const redirectTo = "https://id-preview--247e9b8a-37d6-4949-85c4-3917e55c8126.lovable.app/admin/reset-password";
```

## Recomendacao

A **Opcao 1** (publicar) é a melhor escolha porque:
- O código já está pronto e funcionando
- A URL de produção é a correta para uso real
- Após publicar, o fluxo funcionará para todos os usuários

## Próximos Passos

1. **Publicar o projeto** clicando no botão "Publish"
2. Aguardar a publicação (cerca de 1-2 minutos)
3. Solicitar novo link de recuperação de senha
4. Clicar no link do email - agora a página deve carregar corretamente
