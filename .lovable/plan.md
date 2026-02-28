

## Plano: 3 Melhorias no Fluxo de Pedidos

---

### 1. Cancelamento automático de PIX expirado

**O que faz:** Um cron job que roda a cada 5 minutos e cancela pedidos cujo PIX expirou.

**Implementação:**
- Criar edge function `cancel-expired-pix/index.ts` que:
  - Busca pedidos com `status IN ('pending', 'whatsapp_pending')` e `pix_expiration < now()`
  - Atualiza status para `cancelled` com `cancellation_type = 'pix_expired'`
  - Envia WhatsApp ao cliente informando que o PIX expirou
  - Registra no `order_status_history`
- Registrar no `supabase/config.toml` com `verify_jwt = false`
- Criar cron job via pg_cron para rodar a cada 5 minutos

---

### 2. Notificação ao admin quando PIX for pago

**O que faz:** Ao confirmar pagamento no webhook do Asaas, envia alerta WhatsApp ao dono.

**Implementação:**
- Editar `supabase/functions/asaas-webhook/index.ts`:
  - Após o bloco de `orderStatus === 'approved'`, adicionar envio de alerta WhatsApp para `admin_notify_phone` (ou fallback `branding.whatsapp`)
  - Mensagem: "✅ PAGAMENTO CONFIRMADO! #ORDER_NUMBER - Cliente - Total - Horário"
  - Reutilizar padrão já existente em `send-order-whatsapp` para buscar credenciais

---

### 3. Página de status do pedido em tempo real (já existe, melhorar)

A página `/pedido/:orderNumber` já existe com realtime via Supabase channel. Melhorias:

- **Link direto do PIX na página:** Quando status é `pending`/`whatsapp_pending` e existe `pix_qr_code`, mostrar botão "Pagar PIX" que redireciona para `/pix/:orderId` em vez de mandar pro WhatsApp
- **Auto-refresh visual:** Adicionar indicador pulsante "Atualizando em tempo real" para o cliente saber que a página é ao vivo
- Buscar `id` e `pix_qr_code` no `get-order-status` para habilitar link direto

---

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/cancel-expired-pix/index.ts` | Criar |
| `supabase/config.toml` | Adicionar entry |
| `supabase/functions/asaas-webhook/index.ts` | Editar (adicionar alerta admin) |
| `supabase/functions/get-order-status/index.ts` | Editar (retornar id + pix_qr_code) |
| `src/pages/StatusPedido.tsx` | Editar (link PIX + indicador realtime) |
| Cron job SQL | Executar via insert tool |

