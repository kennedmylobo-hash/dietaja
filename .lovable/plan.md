

## Isolamento Total de Integrações por Tenant

### O Problema Atual

Hoje, **todas** as credenciais de terceiros são compartilhadas via variáveis de ambiente (Secrets) do projeto:

| Serviço | Secret Compartilhado | Impacto |
|---|---|---|
| **Asaas (Pagamento PIX)** | `ASAAS_API_KEY` | Todos os pagamentos vão para a **mesma conta bancária** |
| **WhatsApp (NotificaMe)** | `NOTIFICAME_API_TOKEN` + `NOTIFICAME_WHATSAPP_CHANNEL_TOKEN` | Todas as mensagens saem do **mesmo número de WhatsApp** |
| **Email (Resend)** | `RESEND_API_KEY` | Todos os emails saem do **mesmo domínio** (`pedidos@dietajavca.com.br`) |

Isso significa que se você vender para o "Pratinho Fitness", os pagamentos PIX cairiam na conta do Dieta Já, as mensagens de WhatsApp viriam do número do Dieta Já, etc. Isso **não funciona** para venda real.

---

### A Solução: Credenciais por Tenant no Banco de Dados

Adicionar colunas na tabela `tenants` para armazenar as credenciais individuais de cada restaurante. As Edge Functions passam a buscar as credenciais do tenant em vez de usar `Deno.env.get()`.

#### Novas colunas na tabela `tenants`:

```text
tenants
  + asaas_api_key          (text, encrypted, nullable)
  + asaas_webhook_token    (text, encrypted, nullable)
  + notificame_api_token   (text, encrypted, nullable)
  + notificame_channel_token (text, encrypted, nullable)
  + resend_api_key         (text, encrypted, nullable)
  + resend_from_email      (text, nullable)  -- ex: "pedidos@pratinhofitness.com.br"
```

#### Lógica de Fallback

Para não quebrar o Dieta Já (que já funciona com os Secrets atuais), cada Edge Function usará este padrão:

```text
1. Buscar credenciais do tenant no banco de dados
2. Se não encontrar -> usar Deno.env.get() como fallback (Secrets globais)
3. Usar a credencial resolvida para fazer a chamada à API
```

Isso garante **compatibilidade retroativa** e permite migração gradual.

---

### Isolamento por Serviço

#### 1. Asaas (Pagamento PIX) -- Cada restaurante com sua conta
- Cada restaurante cria sua própria conta no Asaas
- A `asaas_api_key` do restaurante é salva na tabela `tenants`
- O webhook do Asaas continua apontando para a mesma Edge Function, mas ela identifica o tenant pelo `externalReference` (order_id) no payload
- **Resultado**: O dinheiro cai direto na conta do restaurante

#### 2. WhatsApp (NotificaMe) -- Cada restaurante com seu número
- Cada restaurante registra seu próprio número no NotificaMe
- Os tokens `notificame_api_token` e `notificame_channel_token` são salvos por tenant
- **Resultado**: As mensagens saem do número do restaurante

#### 3. Email (Resend) -- Cada restaurante com seu domínio
- Cada restaurante pode ter sua própria API key do Resend e domínio verificado
- Se não tiver, usa o domínio da plataforma como fallback
- **Resultado**: Emails personalizados por marca

---

### Segurança das Credenciais

As chaves de API são dados sensíveis. Para protegê-las:

1. **RLS restritiva**: Apenas o `owner_user_id` do tenant pode ler/atualizar suas credenciais
2. **Colunas sensíveis ocultas nas queries públicas**: As Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY` para acessar (já fazem isso hoje)
3. **Interface Admin**: No painel do restaurante, uma aba "Integrações" permite ao dono configurar suas próprias credenciais com campos do tipo password

---

### Mudanças Necessárias

#### Banco de Dados
- Adicionar 6 colunas à tabela `tenants` (credenciais de integração)
- Criar RLS para proteger as colunas sensíveis

#### Utilitário Compartilhado (Backend)
- Criar `_shared/tenant-credentials.ts` que busca credenciais do tenant e faz fallback para env vars

#### Edge Functions (12 funções)
- `create-asaas-pix`: usar `asaas_api_key` do tenant
- `check-payment-status`: idem
- `cancel-asaas-payment`: idem
- `generate-pix-admin`: idem
- `asaas-webhook`: identificar tenant pelo pedido e usar credenciais corretas
- `send-order-whatsapp`: usar tokens NotificaMe do tenant
- `send-order-approved`: idem
- `send-status-notification`: idem
- `send-cart-reminders`: idem
- `send-pending-reminders`: idem
- `send-order-pending-email`: usar `resend_api_key` e `resend_from_email` do tenant
- `process-pending-notifications`: idem
- `send-review-request`: idem
- `send-recompra-campaigns`: idem

#### Frontend (Painel Admin)
- Nova aba "Integrações" no painel do restaurante para configurar:
  - Chave API do Asaas
  - Tokens do WhatsApp (NotificaMe)
  - Chave do Resend + email remetente
- Formulário com campos mascarados (tipo password)
- Botão de testar conexão para cada serviço

#### Super Admin
- Visibilidade de quais tenants têm integrações configuradas
- Possibilidade de configurar credenciais durante o onboarding

---

### Pré-requisitos para cada Restaurante

Antes de operar de forma 100% independente, cada restaurante precisa:

| Serviço | O que fazer | Quem faz |
|---|---|---|
| **Asaas** | Criar conta, obter API Key, configurar webhook apontando para a mesma URL | Dono do restaurante (com guia) |
| **WhatsApp** | Registrar número no NotificaMe, obter tokens | Dono do restaurante (com guia) |
| **Email** | Criar conta no Resend, verificar domínio, obter API Key | Dono do restaurante (com guia) |

---

### Ordem de Implementação Sugerida

1. **Migração do banco** (novas colunas + RLS)
2. **Utilitário `tenant-credentials.ts`** (lógica de resolução com fallback)
3. **Edge Functions do Asaas** (pagamento é o mais crítico)
4. **Edge Functions do WhatsApp**
5. **Edge Functions do Email**
6. **Interface Admin "Integrações"** (para o dono configurar)
7. **Testes end-to-end** com o Pratinho Fitness

### Resumo

Sim, é 100% possível isolar tudo. A solução é armazenar as credenciais de cada serviço por tenant no banco de dados, com fallback para os Secrets globais. Isso permite que cada restaurante tenha sua própria conta Asaas (dinheiro direto na conta dele), seu próprio número de WhatsApp, e seu próprio domínio de email -- tudo configurável pelo painel admin sem precisar de suporte técnico.

