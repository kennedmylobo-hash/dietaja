# Dieta Já - Checklist de Deploy

## Arquivos preparados
- `netlify.toml` — configuração para deploy no Netlify
- `vercel.json` — configuração para deploy na Vercel
- `public/robots.txt` — regras de crawling para SEO

## Passo a passo

### 1. Escolha a plataforma
- **Netlify**: use `netlify.toml` (já pronto)
- **Vercel**: use `vercel.json` (já pronto)

### 2. Conecte o repositório
- Faça push do código para o GitHub
- Conecte o repositório na plataforma escolhida
- O deploy será automático

### 3. Variáveis de ambiente (você precisa fornecer)
Configure no painel da plataforma (Netlify/Vercel → Environment):

```
VITE_SUPABASE_URL=[SUPABASE_URL]
VITE_SUPABASE_ANON_KEY=[SUPABASE_ANON_KEY]
VITE_ASAAS_API_KEY=[ASAAS_API_KEY]
VITE_ASAAS_ENVIRONMENT=production
VITE_WHATSAPP_NUMBER=[SEU_NUMERO_COM_DDI]
VITE_META_PIXEL_ID=[META_PIXEL_ID]
VITE_APP_URL=[URL_DO_SEU_SITE]
VITE_TENANT_ID=[TENANT_ID]
```

### 4. Deploy das Edge Functions (Supabase)
Faça deploy de cada função:
```bash
supabase functions deploy create-asaas-pix
supabase functions deploy create-infinitepay-checkout
supabase functions deploy create-customer-account
supabase functions deploy send-whatsapp-notification
supabase functions deploy send-email-notification
```

Configure os secrets no Supabase:
```bash
supabase secrets set ASAAS_API_KEY=[SUA_KEY]
supabase secrets set WHATSAPP_TOKEN=[SEU_TOKEN]
supabase secrets set WHATSAPP_PHONE_ID=[SEU_PHONE_ID]
supabase secrets set EMAIL_API_KEY=[SUA_KEY]
supabase secrets set OPENAI_API_KEY=[SUA_KEY]
```

### 5. Domínio
- Registre o domínio (ex: dietaja.com.br)
- Apontar DNS para a plataforma
- Aguardar propagação

### 6. Testes obrigatórios antes de tráfego pago
```
[ ] Home carrega
[ ] Cardápio abre
[ ] Carrinho funciona
[ ] Checkout PIX gera cobrança
[ ] Checkout cartão redireciona
[ ] Webhook atualiza status
[ ] WhatsApp chega
[ ] Página obrigado carrega
[ ] Meta Pixel dispara
[ ] Mobile funciona
```

### 7. Pós-deploy
- Google Search Console: adicionar propriedade
- Testar velocidade (Lighthouse >90)
- Monitorar erros (Sentry ou similar)
