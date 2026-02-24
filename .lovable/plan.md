

# Corrigir Nome nos Emails e Reduzir Spam

## Problema 1: Nome "Meu Restaurante" nos emails
O arquivo `supabase/functions/_shared/tenant-branding.ts` tem o fallback `brand_name: "Meu Restaurante"`. Quando o `tenant_id` nao chega na funcao, ele usa esse valor generico. Precisa mudar o default para "Dieta Ja".

## Problema 2: Email caindo no spam
Causas principais:
- O remetente `noreply@dietajavca.com.br` precisa ter o dominio `dietajavca.com.br` **verificado no Resend** com registros DNS (SPF, DKIM, DMARC)
- A funcao `send-order-confirmation` usa `noreply@dietajavca.com.br` hardcoded ao inves de usar as credenciais do tenant

---

## Plano de Implementacao

### 1. Atualizar o fallback do branding
**Arquivo:** `supabase/functions/_shared/tenant-branding.ts`
- Mudar `brand_name` de `"Meu Restaurante"` para `"Dieta Já"`

### 2. Corrigir `send-order-confirmation` para usar credenciais do tenant
**Arquivo:** `supabase/functions/send-order-confirmation/index.ts`
- Remover `const resend = new Resend(Deno.env.get("RESEND_API_KEY"))` hardcoded
- Importar `getEmailCredentials` de `tenant-credentials.ts`
- Usar `emailCreds.apiKey` e `emailCreds.fromEmail` dinamicamente (mesmo padrao do `send-order-approved`)

### 3. Sobre o spam -- acoes manuais necessarias
Para os emails nao cairem no spam, voce precisa verificar o dominio `dietajavca.com.br` no painel do Resend:
1. Acesse https://resend.com/domains
2. Adicione `dietajavca.com.br`
3. Configure os 3 registros DNS que o Resend vai gerar:
   - **SPF** (TXT record)
   - **DKIM** (TXT record)
   - **DMARC** (TXT record)
4. Aguarde a verificacao (geralmente 5-30 minutos)

Sem esses registros DNS, provedores como Gmail e Outlook enviam direto para spam.

---

## Resumo tecnico das mudancas

| Arquivo | Mudanca |
|---|---|
| `_shared/tenant-branding.ts` | Fallback `brand_name` para "Dieta Ja" |
| `send-order-confirmation/index.ts` | Usar `getEmailCredentials()` ao inves de Resend key hardcoded |

