

# Migrar WhatsApp de NotificaMe para Evolution API

## Resumo
Trocar todo o sistema de envio de WhatsApp da API NotificaMe para a Evolution API que esta rodando na sua VPS (`https://webhook.servidordoxd.online`), instancia `agenciadeia`.

## O que muda

A Evolution API tem um formato diferente do NotificaMe. Em vez de templates, todas as mensagens serao enviadas como texto simples, o que e ate mais flexivel.

**NotificaMe (atual):**
```text
POST https://api.notificame.com.br/v1/channels/whatsapp/messages
Header: X-Api-Token: {token}
Body: { from: channelToken, to: phone, contents: [...] }
```

**Evolution API (novo):**
```text
POST https://webhook.servidordoxd.online/message/sendText/agenciadeia
Header: apikey: {apiKey}
Body: { number: "5577...", text: "mensagem" }
```

## Etapas

### 1. Configurar Secrets
Solicitar duas novas credenciais:
- `EVOLUTION_API_URL` = `https://webhook.servidordoxd.online`
- `EVOLUTION_API_KEY` = a API Key da sua instancia
- `EVOLUTION_INSTANCE_NAME` = `agenciadeia`

### 2. Atualizar banco de dados (migracao)
Adicionar colunas na tabela `tenants` para suporte multi-tenant:
- `evolution_api_url` (text, nullable)
- `evolution_api_key` (text, nullable)
- `evolution_instance_name` (text, nullable)

### 3. Atualizar o modulo de credenciais
Reescrever `supabase/functions/_shared/tenant-credentials.ts`:
- `getWhatsAppCredentials()` passara a retornar `{ apiUrl, apiKey, instanceName }` em vez de `{ apiToken, channelToken }`
- Prioridade: credenciais do tenant > secrets globais

### 4. Criar helper centralizado
Criar `supabase/functions/_shared/evolution-sender.ts` com funcoes:
- `sendWhatsAppText(phone, message, credentials)` - envio de texto
- `sendWhatsAppMedia(phone, mediaUrl, caption, credentials)` - para futuro uso

### 5. Atualizar todas as Edge Functions (9 funcoes)
Cada funcao sera atualizada para usar o novo helper:

| Funcao | Tipo de envio |
|--------|--------------|
| `send-order-whatsapp` | Texto (pedido + pix) |
| `send-order-approved` | Texto (confirmacao) |
| `send-status-notification` | Texto (status) |
| `send-pending-reminders` | Texto (lembrete pix) |
| `send-cart-reminders` | Texto (carrinho abandonado) |
| `send-review-request` | Texto (avaliacao) |
| `send-recompra-campaigns` | Texto (recompra) |
| `process-pending-notifications` | Texto (notificacao) |
| `test-whatsapp-connection` | Texto (teste) |

### 6. Atualizar Webhook
Reescrever `notificame-webhook` para receber webhooks da Evolution API (formato diferente) e atualizar status de delivery/leitura na tabela `notification_events`.

### 7. Configurar webhook na Evolution
Na sua Evolution API, configurar o webhook URL para:
`https://fxlhpizydnbdkhuzrkpr.supabase.co/functions/v1/notificame-webhook`
(vamos renomear internamente mas manter a URL para simplicidade, ou criar uma nova `evolution-webhook`)

---

## Detalhes tecnicos

### Formato Evolution API - Enviar texto
```typescript
const response = await fetch(
  `${apiUrl}/message/sendText/${instanceName}`,
  {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: '557791001658',
      text: 'Mensagem aqui',
    }),
  }
);
```

### Nova interface de credenciais
```typescript
interface WhatsAppCredentials {
  apiUrl: string;      // https://webhook.servidordoxd.online
  apiKey: string;      // API key da instancia
  instanceName: string; // agenciadeia
}
```

### Impacto
- Todas as mensagens de pedido, lembrete, recompra e avaliacao passarao a ser enviadas pela Evolution API
- Templates do NotificaMe serao convertidos para mensagens de texto formatadas (que ja existem como fallback no codigo atual)
- Nenhuma mudanca no frontend - apenas as edge functions sao afetadas

