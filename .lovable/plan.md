

# Checklist para Testar a Revenda do Software (Ponta a Ponta)

## O que ja esta pronto

- Tabela `tenant_landing_content` com RLS
- Bucket `tenant-assets` para imagens
- Onboarding via Super Admin (`/super-admin`) com clonagem de cardapio e seed de conteudo
- Edge Function `create-tenant` com seed automatico de landing content
- Painel Admin com "Minha Loja" (Dados do Restaurante + Editor de Landing)
- Hook `useLandingContent` com fallback hardcoded
- ~10 componentes da landing renderizando conteudo dinamico
- Isolamento multi-tenant via RLS e `tenant_id` em queries/edge functions

---

## O que falta para um teste completo de revenda

### 1. Teste End-to-End do Onboarding

Criar um restaurante ficticio pelo `/super-admin` e validar:
- Tenant criado no banco com todos os campos
- Usuario admin criado e com role `admin`
- Categorias de cardapio clonadas (se checkbox marcada)
- Registros de `tenant_landing_content` seedados (10 secoes)
- Admin consegue logar em `/admin` e ver o painel

Isso e um teste manual -- basta acessar `/super-admin`, preencher o formulario e verificar.

---

### 2. Deteccao de Tenant por Dominio (critico para producao)

Hoje o `TenantContext` usa fallback do "Dieta Ja" em localhost/lovable.app. Para testar um segundo tenant, precisamos de uma forma de simular outro dominio ou usar query param.

**Proposta**: Adicionar suporte a query param `?tenant=slug` no `TenantContext` para testes. Isso permite acessar `/?tenant=meu-restaurante` e ver a landing do novo tenant sem precisar de dominio customizado.

Em producao, a deteccao por hostname ja funciona.

---

### 3. Resolver o Prefixo do Numero de Pedido

A funcao `generate_order_number()` usa prefixo fixo `DJA-`. Para multi-tenant, cada restaurante precisa do seu proprio prefixo.

**Proposta**: Adicionar coluna `order_prefix` na tabela `tenants` (ex: "MFT" para "Marmitas Fitness"). Alterar o trigger para gerar numeros como `MFT-0001` baseado no tenant do pedido.

---

### 4. Personalizar Notificacoes por Tenant

As edge functions de notificacao (WhatsApp, email) provavelmente usam textos/branding do "Dieta Ja". Cada tenant precisa que suas notificacoes usem:
- Nome da marca do tenant
- WhatsApp do tenant
- Logo do tenant (nos emails)

**Proposta**: Atualizar as edge functions `send-order-confirmation`, `send-order-approved`, `send-status-notification` etc. para buscar dados do tenant (`brand_name`, `whatsapp`, `logo_url`) a partir do `tenant_id` do pedido.

---

### 5. Rotas de Landing Pages de Categoria (/detox, /fit, /fitness)

Essas paginas sao especificas do "Dieta Ja" e possuem conteudo hardcoded. Para outros tenants, elas precisam ser dinamicas ou desabilitadas.

**Proposta**: Criar uma tabela `tenant_landing_pages` ou usar a propria `tenant_landing_content` com section_keys como `page_detox`, `page_fit` para permitir que cada tenant configure suas paginas de categoria.

Alternativa mais simples: manter essas rotas apenas para o Dieta Ja por enquanto e focar na landing principal (`/`).

---

## Secao Tecnica -- Resumo das Mudancas

### Prioridade Alta (necessario para testar)

| Tarefa | Tipo | Descricao |
|--------|------|-----------|
| Query param `?tenant=slug` | Frontend | Adicionar deteccao por query param no `TenantContext.tsx` para testes |
| Teste manual de onboarding | Manual | Criar tenant ficticio e validar todo o fluxo |

### Prioridade Media (necessario para producao)

| Tarefa | Tipo | Descricao |
|--------|------|-----------|
| Prefixo de pedido por tenant | SQL + Trigger | Coluna `order_prefix` + alterar `generate_order_number()` |
| Notificacoes com branding | Edge Functions | ~6 edge functions buscam dados do tenant para personalizar mensagens |
| Landing pages de categoria | Frontend | Tornar `/detox`, `/fit`, `/fitness` dinamicas ou desabilitar para outros tenants |

### Prioridade Baixa (melhorias futuras)

| Tarefa | Tipo | Descricao |
|--------|------|-----------|
| Preview da landing no editor | Admin | Botao "Visualizar" que abre a landing em nova aba |
| Tema de cores dinamico | Frontend | Aplicar `primary_color` do tenant via CSS variables |
| Dominio customizado | Infra | Configuracao de DNS para cada tenant |

---

## Recomendacao

Comecar implementando o **item 2 (query param para teste)** e fazer o **item 1 (teste manual de onboarding)**. Isso permite validar todo o fluxo sem precisar de dominio customizado. Os demais itens podem ser feitos incrementalmente.

