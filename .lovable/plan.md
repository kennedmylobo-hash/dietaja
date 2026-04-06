## Varredura Completa - Resultados

### 🔴 CRÍTICO (Segurança)

1. **Cupons expostos publicamente** - Qualquer pessoa pode listar TODOS os cupons ativos (incluindo cupons pessoais como KENNEDY/ALESSA com 99% de desconto). Solução: restringir a policy de SELECT público para validar apenas via RPC (já existe `validate_coupon_code`), removendo a policy pública.

2. **Telefones de clientes expostos via feedback tokens** - A policy `Anyone can view token by value` expõe nome e telefone de todos os tokens ativos. Solução: restringir para que só retorne dados quando filtrado por token específico.

### 🟡 MÉDIO (Segurança)

3. **Proteção contra senhas vazadas desativada** - Ativar leaked password protection no auth.

4. **Realtime sem RLS** - Qualquer usuário autenticado pode se inscrever em qualquer canal Realtime. Risco baixo pois a tabela `orders` não está na publicação Realtime.

5. **Extensão no schema public** - Mover extensões para schema separado (risco baixo).

### 🟢 Performance (DB)

6. **20 índices com 0 scans** - Índices nunca utilizados como `idx_orders_mp_preference_id`, `idx_notification_events_event_type`, etc. Podem ser removidos para reduzir overhead de escrita, mas risco baixo.

### ✅ Rastreamento (OK)

7. O funil Meta está completo (ViewContent → AddToCart → InitiateCheckout → Purchase) com deduplicação e CAPI redundante. Nenhuma ação necessária.

---

**Recomendo corrigir os itens 1 e 2 agora (críticos). Deseja prosseguir?**
