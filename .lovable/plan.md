

# Fase 3 -- Isolamento Multi-tenant (RLS + Queries Frontend + Edge Functions)

## Objetivo

Garantir que cada restaurante (tenant) veja **somente** seus dados em todas as camadas: banco de dados (RLS), frontend (queries) e backend (edge functions). Adicionalmente, ao onboarding de novos tenants, o cardapio do Dieta Ja sera oferecido como modelo opcional para clonagem.

---

## Parte A -- RLS Policies (Migracao SQL)

Atualizar as politicas RLS das ~20 tabelas que possuem `tenant_id` para filtrar por tenant. A estrategia sera:

- **Tabelas publicas (leitura anonima)**: Adicionar `tenant_id = current_setting('app.current_tenant_id')::uuid` ou manter filtro via query frontend (mais simples e sem exigir configuracao de settings no client). **Decisao: filtrar pelo frontend**, ja que o client envia o `tenant_id` nas queries e o RLS garante que admins so vejam dados do seu tenant.

- **Tabelas de admin**: Trocar `has_role(auth.uid(), 'admin')` por `has_role(auth.uid(), 'admin') AND tenant_id = get_current_tenant_id()` para SELECT/UPDATE/DELETE/ALL.

- **Tabelas de INSERT publico** (orders, leads, carts, analytics_events, reviews): Manter INSERT aberto mas adicionar `tenant_id` default no insert.

### Tabelas e mudancas de RLS

| Tabela | Politica atual | Mudanca |
|--------|---------------|---------|
| `orders` | Admin vee tudo | Admin filtra por `tenant_id = get_current_tenant_id()` |
| `marmita_packages` | Admin ALL, Anyone SELECT | Admin ALL com tenant_id, Anyone SELECT com tenant_id (via query) |
| `marmita_flavors` | Admin ALL, Anyone SELECT | Idem |
| `marmita_sides` | Admin ALL, Anyone SELECT | Idem |
| `kit_packages` | Admin ALL, Anyone SELECT | Idem |
| `kit_soups` | Admin ALL, Anyone SELECT | Idem |
| `kit_juices` | Admin ALL, Anyone SELECT | Idem |
| `menu_categories` | Admin ALL, Anyone SELECT | Idem |
| `carts` | Admin SELECT/UPDATE | Admin filtra por tenant_id |
| `leads` | Admin SELECT | Admin filtra por tenant_id |
| `analytics_events` | Admin SELECT | Admin filtra por tenant_id |
| `reviews` | Admin ALL, Anyone SELECT approved | Admin com tenant_id |
| `coupons` | Admin ALL, Anyone SELECT active | Admin com tenant_id |
| `coupon_usage` | Admin SELECT | Admin com tenant_id |
| `cashback_balances` | Admin SELECT | Admin com tenant_id |
| `cashback_transactions` | Admin SELECT | Admin com tenant_id |
| `club_plans` | Admin ALL, Anyone SELECT | Admin com tenant_id |
| `club_subscriptions` | Admin SELECT | Admin com tenant_id |
| `marketing_messages` | Admin ALL | Admin com tenant_id |
| `recurring_customers` | Admin ALL | Admin com tenant_id |
| `reminder_settings` | Admin ALL | Admin com tenant_id |
| `order_status_history` | Admin SELECT/INSERT | Admin com tenant_id |
| `stock_movements` | Admin SELECT/INSERT | Admin com tenant_id |
| `notification_events` | Admin SELECT | Admin com tenant_id |
| `payment_error_logs` | Admin SELECT | Admin com tenant_id |
| `loyalty_levels` | Admin ALL, Anyone SELECT | Admin com tenant_id |
| `recompra_campaigns` | Admin SELECT | Admin com tenant_id |
| `pending_notifications` | Service role ALL | Sem mudanca (service role) |
| `profiles` | Admin SELECT, Users own | Admin com tenant_id |

A migracao SQL ira:
1. Dropar as policies antigas de admin
2. Recriar com filtro `tenant_id = get_current_tenant_id()` usando a funcao ja existente
3. Para tabelas de leitura publica, manter as policies atuais (o filtro sera feito na query)

---

## Parte B -- Frontend: Queries com tenant_id

Adaptar todos os hooks e componentes que fazem queries ao Supabase para incluir `.eq('tenant_id', tenant.id)` usando o contexto do `useTenant()`.

### Arquivos afetados

**Hooks de dados publicos (cardapio):**
- `src/hooks/useMenuData.ts` -- Adicionar `tenant_id` filter em todos os 7 hooks (useMarmitaPackages, useMarmitaFlavors, useKitPackages, etc.)
- `src/hooks/useMenuCategories.ts` -- Adicionar `tenant_id` filter
- `src/hooks/useClubPlans.ts` -- Adicionar `tenant_id` filter

**Hooks de analytics/tracking:**
- `src/hooks/useAnalytics.ts` -- Inserir `tenant_id` nos inserts de analytics_events
- `src/hooks/useSectionTracking.ts` -- Inserir `tenant_id` nos inserts

**Hooks de cashback:**
- `src/hooks/useCashback.ts` -- Queries de loyalty_levels, cashback_balances, cashback_transactions (tenant_id filter para leitura publica)

**Cart e Checkout:**
- `src/components/CartContext.tsx` -- Adicionar `tenant_id` nos inserts/updates de carts
- `src/components/CartDrawer.tsx` -- Adicionar `tenant_id` nos inserts de orders
- `src/components/CheckoutForm.tsx` -- Passa tenant_id para edge functions

**Componentes Admin (todos precisam de tenant_id filter):**
- `src/components/admin/OrdersManager.tsx`
- `src/components/admin/KPIDashboard.tsx`
- `src/components/admin/LiveCarts.tsx`
- `src/components/admin/LiveVisitors.tsx`
- `src/components/admin/ProductionPanel.tsx`
- `src/components/admin/MenuManager.tsx`
- `src/components/admin/CategoryManager.tsx`
- `src/components/admin/SidesManager.tsx`
- `src/components/admin/ReviewsManager.tsx`
- `src/components/admin/CustomersManager.tsx`
- `src/components/admin/MarketingManager.tsx`
- `src/components/admin/StockReport.tsx`
- `src/components/admin/StockHistory.tsx`
- `src/components/admin/RecurringCustomers.tsx`
- `src/components/admin/AbandonedCartsRecovery.tsx`
- `src/components/admin/PendingOrdersRecovery.tsx`
- `src/components/admin/NotificationStats.tsx`
- `src/components/admin/FunnelReport.tsx`
- `src/components/admin/WhatsAppOrderImporter.tsx`
- `src/components/admin/PaymentErrorLogs.tsx`

**Paginas:**
- `src/pages/Admin.tsx` -- Queries de leads e analytics_events com tenant_id
- `src/pages/Avaliar.tsx` -- Insert de reviews com tenant_id
- `src/pages/StatusPedido.tsx` -- Query de orders com tenant_id

### Estrategia de implementacao

Criar um hook utilitario `useTenantId()` que retorna o `tenant.id` do contexto, simplificando o uso:

```typescript
// Nos hooks de dados
const { tenant } = useTenant();
// Nas queries
.eq('tenant_id', tenant?.id)
```

Para os hooks que usam `useQuery`, o `tenant_id` sera parte da `queryKey` para cache correto por tenant.

---

## Parte C -- Edge Functions com tenant_id

Todas as edge functions que leem/escrevem no banco precisam receber e/ou resolver o `tenant_id`. A estrategia:

1. **Edge functions chamadas pelo frontend** (create-asaas-pix, validate-coupon, create-club-subscription, etc.): Receber `tenant_id` no body da requisicao
2. **Edge functions de webhook** (asaas-webhook, notificame-webhook, resend-webhook): Resolver tenant_id a partir do order_id
3. **Edge functions de cron/batch** (send-cart-reminders, send-recompra-campaigns, etc.): Iterar por tenant ou resolver tenant_id do registro

### Edge functions a atualizar (~20)

Cada uma precisara incluir `tenant_id` nos INSERTs e filtrar por `tenant_id` nos SELECTs:
- `create-asaas-pix` -- Recebe tenant_id, passa para insert de orders
- `asaas-webhook` -- Resolve tenant_id do order
- `validate-coupon` -- Filtra cupons por tenant_id
- `create-club-subscription` -- Insere com tenant_id
- `create-customer-account` -- Insere profile com tenant_id
- `decrement-stock` -- Filtra por tenant_id
- `process-cashback` -- Filtra por tenant_id
- `send-order-confirmation`, `send-order-approved`, `send-order-whatsapp`, `send-order-pending-email`, `send-status-notification` -- Resolve do order
- `send-cart-reminders`, `send-pending-reminders` -- Resolve do cart/order
- `send-recompra-campaigns`, `send-review-request` -- Resolve do order
- `generate-pix-admin` -- Recebe tenant_id
- `check-payment-status`, `cancel-asaas-payment`, `get-pix-details`, `get-order-status` -- Resolve do order

---

## Parte D -- Clonagem de Cardapio (Sugestao do Dieta Ja)

Atualizar a edge function `create-tenant` para aceitar um parametro opcional `clone_menu_from` (tenant_id de origem). Quando informado:

1. Copiar todos os `marmita_packages` do tenant origem para o novo (com novo tenant_id)
2. Copiar `marmita_flavors` e `marmita_sides`
3. Copiar `kit_packages`, `kit_soups`, `kit_juices`
4. Copiar `menu_categories`
5. Copiar `loyalty_levels` e `club_plans`

Atualizar o formulario de onboarding em `SAOnboarding.tsx` com um checkbox "Clonar cardapio do Dieta Ja como modelo" (pre-marcado).

---

## Secao Tecnica -- Resumo de Mudancas

### Migracao SQL (1 grande migracao)
- DROP + CREATE de ~50 RLS policies para ~27 tabelas
- Todas as policies de admin passam a incluir `tenant_id = get_current_tenant_id()`

### Arquivos frontend (~30 arquivos)
- Todos os hooks de dados: adicionar `.eq('tenant_id', tenant?.id)` e `tenant_id` na queryKey
- Todos os inserts: incluir `tenant_id` no payload
- Componentes admin: filtrar queries pelo tenant do admin logado

### Edge functions (~20 funcoes)
- Adicionar `tenant_id` nos inserts
- Filtrar reads por `tenant_id`
- Edge function `create-tenant`: adicionar logica de clonagem de cardapio

### Impacto
- Zero breaking change para o tenant "Dieta Ja" (tenant_id default ja existe em todos os registros)
- Novos tenants terao isolamento completo
- Admins de cada tenant verao apenas seus dados

