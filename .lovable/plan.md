

## Bloco 4: Migrar Edge Functions + Residuos Frontend para Branding Dinamico

### Resumo

Migrar 10 Edge Functions e 2 arquivos frontend para usar dados dinamicos do tenant, removendo todas as referencias hardcoded a "Dieta Ja", "dietajavca.com.br" e "Vitoria da Conquista".

---

### Estrategia

Todas as Edge Functions que enviam notificacoes (email/WhatsApp) precisam:
1. Resolver o `tenant_id` a partir do pedido (`orders.tenant_id`)
2. Chamar `getTenantBranding(supabase, tenantId)` para obter nome, whatsapp, dominio
3. Usar `getTenantBaseUrl(branding)` para gerar URLs dinamicas
4. Substituir strings hardcoded pelo branding dinamico

O `from` do email mantera o dominio `pedidos@dietajavca.com.br` (unico verificado no Resend), mas com o **nome** dinamico: `"NomeDaMarca <pedidos@dietajavca.com.br>"`.

---

### Edge Functions a Modificar

#### 1. `send-order-whatsapp/index.ts`
- Importar `getTenantBranding` e `getTenantBaseUrl`
- Buscar `tenant_id` do pedido (ja faz `select('*')` no order)
- Substituir `"DIETA JA"` nos 3 FALLBACK_TEMPLATES por `branding.brand_name`
- Substituir `dietajavca.com.br/pedido/...` e `dietajavca.com.br/pix/...` por `getTenantBaseUrl(branding)`
- **Linhas afetadas:** 234 (fallback templates), 391 (link variable), 418 (pixPageLink)

#### 2. `send-cart-reminders/index.ts`
- Importar branding utils
- Buscar `tenant_id` do carrinho (precisa adicionar ao select ou usar default)
- Na funcao `generateCartReminderMessage`: substituir "Dieta Ja", "dietajavca.com.br" e "Vitoria da Conquista" por dados do branding
- **Linhas afetadas:** corpo das 2 mensagens de lembrete (primeira e segunda)

#### 3. `send-order-pending-email/index.ts`
- Importar branding utils
- Receber `tenant_id` no body da requisicao (ou buscar do pedido)
- Em `generateEmailHtml`: substituir header "Dieta Ja", subtitulo "Vitoria da Conquista", WhatsApp hardcoded, footer "Dieta Ja"
- No `resend.emails.send`: trocar `from: "Dieta Ja <pedidos@...>"` por `"${branding.brand_name} <pedidos@dietajavca.com.br>"`
- **Linhas afetadas:** 69, 70, 131-132, 136-137, 153-154, 157, 203

#### 4. `send-pending-reminders/index.ts`
- Importar branding utils
- Para cada pedido processado, buscar `tenant_id` e resolver branding
- Em `generateWhatsAppMessage` (linha 214-231): substituir "Equipe Dieta Ja" por `branding.brand_name`
- Em `generateReminderEmail` (linha 539-650): substituir WhatsApp link hardcoded `5577991001658`, footer "Dieta Ja"
- No `resend.emails.send` (linha 356): trocar `from: "Dieta Ja <pedidos@...>"`
- **Linhas afetadas:** 231, 356, 556, 638

#### 5. `process-pending-notifications/index.ts`
- Importar branding utils
- Buscar `tenant_id` do pedido (adicionar ao select)
- Em `replaceVariables` (linha 60-74): substituir `dietajavca.com.br` por URL dinamica
- Em `sendEmailNotification` (linha 114-187): substituir WhatsApp link `5577991001658`, `from: "Dieta Ja"`, footer
- **Linhas afetadas:** 62, 123, 169, 178

#### 6. `send-review-request/index.ts`
- Importar branding utils
- Buscar `tenant_id` dos pedidos
- Em `replaceVariables` (linha 20-29): substituir `dietajavca.com.br`
- Em `sendEmailNotification` (linha 75-150): substituir WhatsApp `5577991001658`, footer "Dieta Ja", `from: "Dieta Ja"`
- **Linhas afetadas:** 22, 119, 131, 141

#### 7. `send-recompra-campaigns/index.ts`
- Importar branding utils
- Buscar `tenant_id` dos pedidos
- Em `replaceVariables` (linha 33-45): substituir `siteUrl = "https://dietajavca.com.br"`
- Em `sendEmailNotification` (linha 100-183): substituir WhatsApp `5577991001658`, footer "Dieta Ja", `from: "Dieta Ja"`
- **Linhas afetadas:** 35, 110, 160-161, 164, 174

#### 8. `generate-pix-admin/index.ts`
- Importar branding utils
- Buscar `tenant_id` do pedido
- Substituir descricao "Dieta Ja" na cobranca Asaas (linha 155)
- **Linhas afetadas:** 155

#### 9. `create-asaas-pix/index.ts`
- Importar branding utils
- Buscar branding com `effectiveTenantId` ja disponivel
- Substituir descricao "Pedido Dieta Ja" (linha 334) por `branding.brand_name`
- **Linhas afetadas:** 334

#### 10. `test-whatsapp-connection/index.ts`
- Nao precisa de branding do banco (e funcao de teste)
- Substituir "Teste de conexao Dieta Ja" por "Teste de conexao" generico
- **Linhas afetadas:** mensagem de teste na linha ~90

---

### Frontend Residuos

#### 11. `src/pages/StatusPedido.tsx`
- Importar `useTenantConfig`
- Substituir `<title>Acompanhar Pedido | Dieta Ja</title>` (linha 233) por titulo dinamico
- Substituir WhatsApp `5577991001658` (linhas 477, 488, 503) por `contact.whatsapp`
- **Linhas afetadas:** 233, 477, 488, 503

#### 12. `src/lib/print-utils.ts`
- A funcao `generateOrderTicketHTML` precisa receber `brandName` como parametro
- Substituir `<h1>DIETA JA</h1>` (linha 189) por parametro dinamico
- Atualizar chamadores (`printOrderTicket` e componentes admin que chamam)
- **Linhas afetadas:** 82 (assinatura), 189 (header), 240 (printOrderTicket)

---

### Padrao de Implementacao nas Edge Functions

Para cada funcao, o padrao sera:

```text
// No topo do arquivo:
import { getTenantBranding, getTenantBaseUrl } from "../_shared/tenant-branding.ts";

// Dentro do handler, apos buscar o pedido:
const branding = await getTenantBranding(supabase, order.tenant_id);
const baseUrl = getTenantBaseUrl(branding);

// Substituicoes:
// "Dieta Ja" -> branding.brand_name
// "dietajavca.com.br" -> baseUrl (sem https://)
// "5577991001658" -> branding.whatsapp
// "(77) 99100-1658" -> branding.whatsapp_formatted
// "Vitoria da Conquista" -> branding.city
```

---

### Nota sobre Emails

O `from` do Resend continuara usando `pedidos@dietajavca.com.br` como dominio (unico verificado). O que muda e o **display name**: de `"Dieta Ja"` para `branding.brand_name`. Exemplo: `"Pratinho Fitness <pedidos@dietajavca.com.br>"`.

---

### Ordem de Implementacao

1. Edge Functions de notificacao de pedido (send-order-whatsapp, send-order-pending-email)
2. Edge Functions de lembrete (send-pending-reminders, send-cart-reminders, process-pending-notifications)
3. Edge Functions de marketing (send-review-request, send-recompra-campaigns)
4. Edge Functions de pagamento (create-asaas-pix, generate-pix-admin, test-whatsapp-connection)
5. Frontend residuos (StatusPedido.tsx, print-utils.ts)

