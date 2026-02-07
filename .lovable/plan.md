

## Correção: send-password-reset + Diagnóstico de Entrega

### Diagnóstico

Os logs confirmam que o email **foi enviado com sucesso** pelo Resend. O problema é de **entrega/classificação do Gmail**, não de código. O Kennedy deve verificar:
- Pasta de **Spam/Lixo Eletrônico**
- Aba **Promoções** ou **Atualizações** do Gmail

### Correção Técnica Pendente

A função `send-password-reset` é a única que ainda **não foi migrada** para usar o sistema de credenciais por tenant. Ela usa:
- `RESEND_API_KEY` global direto (em vez de `getEmailCredentials`)
- `from: "PedidoJá <pedidos@dietajavca.com.br>"` hardcoded

### Mudanças

**Arquivo: `supabase/functions/send-password-reset/index.ts`**

1. Importar `getEmailCredentials` de `../_shared/tenant-credentials.ts`
2. Remover `const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")` do topo
3. Após resolver o branding, chamar `getEmailCredentials(supabaseAdmin, resolvedTenantId)`
4. Usar `emailCreds.apiKey` no header Authorization do fetch ao Resend
5. Usar `branding.brand_name` no display name do `from` em vez de "PedidoJá" hardcoded
6. Manter `emailCreds.fromEmail` como domínio do remetente

Isso alinha esta função com todas as outras já migradas e garante que, quando um tenant tiver sua própria chave Resend, o email de reset de senha também usará a credencial correta.

