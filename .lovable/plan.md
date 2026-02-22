

# Sistema de Teste A/B Automatico com Relatorio no Painel Admin

## Resumo

O sistema vai funcionar 100% automatico: voce cria o teste no painel, e ele roda sozinho. O relatorio atualiza em tempo real mostrando qual variante esta ganhando, taxa de retencao, vendas, e confianca estatistica.

## Como vai funcionar para voce

1. No painel admin, em "Analytics", aparece uma nova opcao: **Teste A/B**
2. Voce cria um teste escolhendo o que quer testar (titulo do Hero, texto do CTA, etc.)
3. Define o texto da variante A (atual) e variante B (nova)
4. Ativa o teste e pronto - ele roda sozinho
5. O relatorio mostra em tempo real:
   - Visitantes de cada variante
   - Pedidos de cada variante
   - Taxa de conversao (%) de cada uma
   - Receita total por variante
   - Ticket medio por variante
   - Taxa de retencao (clientes que voltaram)
   - Qual variante esta ganhando com indicador visual
   - Confianca estatistica (ex: "92% de certeza que B e melhor")

## O que aparece no relatorio

| Metrica | Variante A | Variante B | Diferenca |
|---------|-----------|-----------|-----------|
| Visitantes | 1.200 | 1.180 | - |
| Pedidos | 48 | 67 | +39% |
| Conversao | 4.0% | 5.7% | +42% |
| Receita | R$ 4.320 | R$ 6.030 | +39% |
| Ticket Medio | R$ 90 | R$ 90 | 0% |
| Retencao | 12% | 18% | +50% |
| Confianca | - | - | 94% |

---

## Detalhes tecnicos

### 1. Nova tabela `ab_tests`

Armazena testes configurados pelo admin:
- `id`, `tenant_id`, `name`
- `target_section` (hero_title, hero_subtitle, cta_text)
- `variant_a_value` (texto atual)
- `variant_b_value` (texto novo)
- `status` (active / paused / completed)
- `traffic_split` (default 50 - porcentagem para variante B)
- `winner` (null, a, b)
- `created_at`, `ended_at`

RLS: admin pode gerenciar (ALL) com `has_role + tenant_id`; leitura publica para testes ativos.

### 2. Hook `useABTest.ts`

- Busca testes ativos para o tenant (1 query, cacheada com react-query)
- Sorteia variante 50/50, salva em `localStorage` com chave `ab_test_{test_id}`
- Retorna `getVariantValue(targetSection)` que devolve o texto correto
- Grava evento `ab_variant_assigned` na `analytics_events` com `metadata: { test_id, variant }` (apenas 1x por sessao)

### 3. Integracao com analytics e pedidos

- `useAnalytics.ts`: todos os eventos incluem `metadata.ab_test_id` e `metadata.ab_variant` quando teste ativo
- `CartContext.tsx`: ao criar pedido, inclui `ab_test_id` e `ab_variant` no campo `utm_data` (jsonb)
- Zero impacto em performance: apenas adiciona 2 campos ao objeto existente

### 4. Componente `ABTestManager.tsx` (Admin)

- Lista testes existentes (ativos, pausados, finalizados)
- Formulario para criar novo teste
- Botoes para ativar/pausar/encerrar e declarar vencedor
- Historico de testes anteriores

### 5. Componente `ABTestReport.tsx` (Admin)

- Busca `analytics_events` filtrando por `metadata->ab_test_id`
- Busca `orders` filtrando por `utm_data->ab_test_id`
- Calcula para cada variante:
  - Sessoes unicas (visitantes)
  - Pedidos confirmados
  - Taxa de conversao
  - Receita total
  - Ticket medio
  - Taxa de retencao (clientes com 2+ pedidos)
  - Confianca estatistica (teste Z para proporcoes)
- Exibe cards comparativos com badge "Ganhando" na melhor variante
- Grafico de conversao diaria por variante

### 6. Consumo nas paginas

- `HeroSection.tsx`: usa `useABTest` para pegar titulo/subtitulo alternativo
- Fallback seguro: se nao ha teste ativo, mostra o conteudo original (variante A)

### Arquivos a criar

- `src/hooks/useABTest.ts`
- `src/components/admin/ABTestManager.tsx`
- `src/components/admin/ABTestReport.tsx`
- Migracao SQL para tabela `ab_tests`

### Arquivos a modificar

- `src/components/HeroSection.tsx` - consumir variante
- `src/hooks/useAnalytics.ts` - incluir ab_variant nos eventos
- `src/components/CartContext.tsx` - incluir ab_variant no pedido
- `src/components/admin/AdminSidebar.tsx` - nova opcao "Teste A/B" no menu
- `src/pages/Admin.tsx` - renderizar ABTestManager/Report

### Impacto em performance

- 1 query extra no carregamento (cacheada por 5 min)
- localStorage para nao repetir atribuicao
- Nenhuma biblioteca nova
- Zero alteracao no fluxo de checkout existente

