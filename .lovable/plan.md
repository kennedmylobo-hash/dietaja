
# Clube Dieta Ja - Assinatura Mensal Recorrente

## Visao Geral

Criar uma pagina dedicada `/clubedietaja` com estilo "clube de assinatura" (inspirado em clubes de vinho) onde o cliente escolhe um dos 5 kits mensais, preenche seus dados e assina via cobranca recorrente automatica pelo Asaas.

## Os 5 Kits do Clube

| Kit | Conteudo | Ciclo |
|-----|----------|-------|
| Kit Suco Detox | 20 sucos detox sortidos/mes | Mensal |
| Kit Marmitas | 20 marmitas sortidas/mes | Mensal |
| Kit Sopas | 20 sopas sortidas/mes | Mensal |
| Kit Almoco + Janta | 20 marmitas + 20 sopas sortidos/mes | Mensal |
| Kit Almoco + Suco | 20 marmitas + 20 sucos sortidos/mes | Mensal |

Precos placeholder serao inseridos e podem ser ajustados depois pelo painel Admin.

## Estrutura da Pagina

A pagina seguira o padrao visual das landing pages existentes (/detox, /fit, /fitness) mas com identidade propria de "clube exclusivo":

1. **Hero Section** - Titulo "Clube Dieta Ja", subtitulo sobre conveniencia e economia, badge "Assinatura Mensal", imagem atrativa
2. **Vantagens do Clube** - Cards destacando: sabores sortidos (surpresa todo mes), preco mais acessivel, entrega mensal automatica, sem compromisso de fidelidade, praticidade zero esforco
3. **Cards dos 5 Kits** - Grid com os planos, preco mensal, descricao do conteudo, botao "Assinar"
4. **Como Funciona** - Passos: Escolha o kit -> Cadastre-se -> Receba todo mes
5. **FAQ do Clube** - Perguntas sobre cancelamento, troca de kit, dia da entrega, etc.
6. **Garantia** - Mesma secao de garantia das outras paginas

## Fluxo de Assinatura

```text
Cliente escolhe kit
       |
       v
Modal de cadastro (nome, email, telefone, CPF, endereco)
       |
       v
Edge Function "create-asaas-subscription"
  1. Cria/busca cliente no Asaas
  2. Cria subscription com cycle=MONTHLY e billingType=PIX
  3. Salva assinatura na tabela "club_subscriptions"
  4. Retorna link do primeiro PIX
       |
       v
Redireciona para pagina PIX (/pix/:paymentId) ja existente
       |
       v
Webhook existente (asaas-webhook) processa pagamentos futuros
```

## Secao Tecnica

### 1. Banco de Dados

Nova tabela `club_subscriptions`:
- `id` (uuid, PK)
- `asaas_subscription_id` (text) - ID da subscription no Asaas
- `asaas_customer_id` (text) - ID do cliente no Asaas
- `customer_name`, `customer_email`, `customer_phone`, `customer_cpf` (text)
- `delivery_option` (text - pickup/delivery)
- `delivery_address` (text, nullable)
- `kit_type` (text - suco_detox, marmitas, sopas, almoco_janta, almoco_suco)
- `kit_name` (text)
- `price` (numeric)
- `status` (text - active, paused, cancelled, overdue)
- `next_due_date` (date)
- `created_at`, `updated_at` (timestamptz)

Nova tabela `club_plans` (para gerenciar kits pelo Admin):
- `id` (uuid, PK)
- `name` (text) - Ex: "Kit Suco Detox"
- `kit_type` (text) - Identificador unico
- `description` (text)
- `items_description` (text) - Ex: "20 sucos detox sortidos"
- `price` (numeric)
- `active` (boolean)
- `popular` (boolean)
- `sort_order` (integer)
- `icon_emoji` (text)

RLS: Leitura publica nos planos, leitura/escrita restrita nas subscriptions via service role (edge function).

### 2. Edge Function: `create-club-subscription`

- Recebe dados do cliente + kit escolhido
- Cria/busca customer no Asaas (reaproveitando logica do create-asaas-pix)
- Chama `POST /v3/subscriptions` do Asaas com:
  - `billingType: "PIX"`
  - `cycle: "MONTHLY"`
  - `value: preco_do_kit`
  - `nextDueDate: proxima data`
  - `description: nome_do_kit`
- Salva registro em `club_subscriptions`
- Retorna ID do primeiro pagamento gerado para redirecionar ao PIX

### 3. Webhook (asaas-webhook existente)

Adicionar tratamento para eventos de subscription:
- `PAYMENT_CREATED` com campo `subscription` - associar pagamento a assinatura
- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` - marcar como pago
- Atualizar status da subscription conforme eventos

### 4. Componentes Frontend

Novos arquivos:
- `src/pages/ClubeDietaJa.tsx` - Pagina principal com CartProvider
- `src/components/clube/ClubHero.tsx` - Hero section exclusiva do clube
- `src/components/clube/ClubBenefits.tsx` - Vantagens do clube
- `src/components/clube/ClubPlanCards.tsx` - Cards dos 5 kits
- `src/components/clube/ClubSubscriptionModal.tsx` - Modal de cadastro para assinatura
- `src/components/clube/ClubFAQ.tsx` - FAQ especifico do clube
- `src/components/clube/ClubHowItWorks.tsx` - Como funciona adaptado

Hook:
- `src/hooks/useClubPlans.ts` - React Query para buscar planos do clube

Rota no App.tsx:
- `/clubedietaja` -> `ClubeDietaJa`

### 5. Dados Iniciais (seed)

Inserir os 5 planos na tabela `club_plans` com precos placeholder (ex: R$ 199,90 a R$ 399,90).

### 6. Identidade Visual

Cor de destaque: dourado/amber para transmitir exclusividade (diferente das landing pages existentes). Badge "Clube Exclusivo" com icone de coroa ou estrela.
