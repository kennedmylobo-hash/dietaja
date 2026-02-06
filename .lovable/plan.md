

# Plataforma SaaS Multi-Tenant para Restaurantes

## Visao Geral

Transformar o sistema atual em uma plataforma white-label onde multiplos restaurantes operam dentro de uma unica infraestrutura. Cada restaurante tera seu proprio dominio, marca, cardapio e painel admin completo. Voce (Super Admin) gerencia tudo por um painel master.

## Arquitetura Multi-Tenant

```text
Requisicao do navegador
        |
        v
Detecta hostname (ex: restaurante1.com.br)
        |
        v
Busca tenant_id pela tabela "tenants" (coluna domain)
        |
        v
Carrega configuracoes do tenant (nome, cores, logo, contato)
        |
        v
Renderiza o site com a identidade do restaurante
        |
        v
Todas as queries filtram por tenant_id automaticamente
```

## Estrutura de Dominios

Cada restaurante pode ter:
- **Subdominio gratuito**: restaurante.suaplataforma.com.br (automatico)
- **Dominio proprio**: restaurante.com.br (cliente configura DNS apontando A record para 185.158.133.1)

A deteccao do tenant usa `window.location.hostname` para buscar o registro correspondente na tabela `tenants`.

## Papeis de Usuario

| Papel | Acesso |
|-------|--------|
| **super_admin** | Painel master, gerencia todos os tenants, planos e cobrancas |
| **admin** | Painel admin do restaurante (pedidos, cardapio, estoque, marketing, analytics) |
| **customer** | Area do cliente (minha conta, historico de pedidos) |

## Modulo de Monetizacao

- Cada restaurante tem um `plan_type` (basico, pro, premium) com mensalidade fixa
- Super Admin define os planos e precos
- Controle de status: ativo, inadimplente, cancelado
- Cobranca pode ser manual inicialmente, com automacao via Asaas futuramente

## Secao Tecnica

### 1. Novas Tabelas no Banco de Dados

**Tabela `tenants`** (cada restaurante e um tenant):
- `id` (uuid, PK)
- `slug` (text, unique) -- para subdominios
- `domain` (text, unique, nullable) -- dominio proprio
- `brand_name` (text)
- `brand_slogan` (text)
- `logo_url` (text, nullable)
- `primary_color` (text, default '#22c55e')
- `city`, `state` (text)
- `whatsapp`, `whatsapp_formatted` (text)
- `delivery_fee` (numeric)
- `pickup_neighborhood` (text)
- `facebook_pixel_id` (text, nullable)
- `google_analytics_id` (text, nullable)
- `og_image_url` (text, nullable)
- `plan_type` (text -- free, basic, pro, premium)
- `plan_price` (numeric)
- `plan_status` (text -- active, overdue, cancelled, trial)
- `plan_due_date` (date, nullable)
- `is_active` (boolean, default true)
- `owner_user_id` (uuid, referencia auth.users)
- `created_at`, `updated_at` (timestamptz)

**Tabela `platform_plans`** (planos da plataforma):
- `id` (uuid, PK)
- `name` (text) -- "Basico", "Pro", "Premium"
- `slug` (text, unique)
- `price` (numeric)
- `features` (jsonb) -- lista de funcionalidades incluidas
- `max_products` (integer, nullable)
- `max_orders_month` (integer, nullable)
- `active` (boolean)
- `sort_order` (integer)

**Modificacao em TODAS as tabelas existentes:**
- Adicionar coluna `tenant_id` (uuid, FK para tenants, NOT NULL com default)
- Atualizar RLS para filtrar por `tenant_id`
- Dados existentes recebem o tenant_id do "Dieta Ja" (primeiro tenant)

Tabelas afetadas:
- `orders`, `carts`, `leads`, `analytics_events`
- `marmita_flavors`, `marmita_packages`, `marmita_sides`
- `kit_juices`, `kit_soups`, `kit_packages`
- `menu_categories`, `reviews`, `coupons`, `coupon_usage`
- `stock_movements`, `marketing_messages`, `notification_events`
- `recurring_customers`, `payment_error_logs`
- `reminder_settings`, `recompra_campaigns`, `pending_notifications`
- `order_status_history`, `profiles`
- `cashback_balances`, `cashback_transactions`, `loyalty_levels`
- `club_plans`, `club_subscriptions`

### 2. Atualizacao do Enum de Roles

Adicionar `super_admin` ao enum `app_role`:

```text
ALTER TYPE app_role ADD VALUE 'super_admin';
```

### 3. RLS Atualizado (Exemplo)

Todas as tabelas passam a incluir filtro por tenant:

```text
-- Exemplo para orders:
CREATE POLICY "Tenant isolation" ON orders
FOR ALL USING (
  tenant_id = get_current_tenant_id()
);
```

Uma funcao `get_current_tenant_id()` busca o tenant do usuario autenticado via tabela `profiles` (que tera `tenant_id`).

Super Admins bypassam o filtro de tenant.

### 4. Contexto de Tenant no Frontend

**Novo provider: `TenantProvider`** (`src/contexts/TenantContext.tsx`):
- Detecta hostname ao inicializar
- Busca configuracoes do tenant na tabela `tenants`
- Disponibiliza via React Context para todo o app
- Substitui o `siteConfig` estatico por dados dinamicos

```text
App
 └── TenantProvider (detecta tenant pelo dominio)
      └── CartProvider
           └── Routes
                ├── / (Index -- site do restaurante)
                ├── /cardapio
                ├── /admin (painel do restaurante)
                └── /super-admin (painel master -- so voce)
```

### 5. Paginas do Super Admin

Nova rota `/super-admin` com:

- **Dashboard**: Total de restaurantes, receita da plataforma, restaurantes ativos/inativos
- **Gerenciar Restaurantes**: CRUD completo de tenants (nome, cores, dominio, logo, plano)
- **Planos**: Gerenciar planos da plataforma (precos, limites, funcionalidades)
- **Cobrancas**: Status de pagamento de cada restaurante, marcar como pago/inadimplente
- **Onboarding**: Formulario para cadastrar novo restaurante (cria tenant + usuario admin)

### 6. Fluxo de Onboarding de Novo Restaurante

```text
Super Admin preenche formulario
  (nome, dominio, email do dono, plano)
        |
        v
Edge Function "create-tenant"
  1. Cria registro na tabela tenants
  2. Cria usuario admin via Supabase Auth
  3. Atribui role "admin" + tenant_id no profile
  4. Seed de dados iniciais (categorias padrao, configs)
  5. Envia email de boas-vindas com credenciais
        |
        v
Restaurante pronto para usar
```

### 7. Adaptacao do Admin Existente

O painel `/admin` atual continuara funcionando, mas:
- Filtra dados automaticamente pelo `tenant_id` do usuario logado
- Usa cores e marca do tenant
- O menu lateral mostra o nome do restaurante

### 8. Edge Functions Atualizadas

Todas as edge functions passam a receber/detectar `tenant_id`:
- `create-asaas-pix`: usa chave Asaas do tenant (ou da plataforma)
- `asaas-webhook`: identifica tenant pelo pedido
- `send-order-confirmation`: usa marca do tenant no template
- Nova: `create-tenant` -- onboarding de restaurante

### 9. Armazenamento de Secrets por Tenant

Cada restaurante pode ter suas proprias chaves (Asaas, WhatsApp, etc):
- Nova tabela `tenant_secrets` (criptografada)
- Ou: todos usam a mesma chave da plataforma (voce cobra taxa sobre transacoes)

### 10. Prioridade de Implementacao

A migracao sera feita em fases para nao quebrar o sistema atual:

**Fase 1 - Infraestrutura** (primeiro):
- Criar tabelas `tenants` e `platform_plans`
- Adicionar `tenant_id` em todas as tabelas existentes
- Migrar dados existentes para tenant "Dieta Ja"
- Atualizar enum `app_role` com `super_admin`
- Criar `TenantProvider` no frontend

**Fase 2 - Super Admin**:
- Pagina `/super-admin` com dashboard e CRUD de tenants
- Edge function `create-tenant` para onboarding
- Gerenciamento de planos

**Fase 3 - Isolamento**:
- Atualizar todas as RLS policies com filtro de tenant
- Atualizar todas as queries do frontend para incluir tenant_id
- Adaptar o `/admin` para contexto multi-tenant

**Fase 4 - Polimento**:
- Sistema de cobranca de mensalidade
- Templates de email com marca do tenant
- Pagina de onboarding self-service (opcional)

### Riscos e Cuidados

- A migracao de `tenant_id` em tabelas existentes precisa de DEFAULT para nao quebrar inserts atuais
- O tenant "Dieta Ja" sera o primeiro e continuara funcionando normalmente durante a migracao
- As edge functions precisam ser atualizadas gradualmente para suportar multi-tenant
- O `siteConfig` estatico sera mantido como fallback enquanto o `TenantProvider` nao carregar

