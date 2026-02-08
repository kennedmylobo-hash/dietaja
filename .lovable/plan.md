

# Painel de Precificacao Personalizavel - Dieta Personalizada

## Problema atual

O sistema atual tem apenas um campo "Preco por grama (R$)" fixo em R$ 0,08. Nao existe:
- Visao de **custo** dos ingredientes
- Calculo de **margem de lucro**
- Personalizacao dos **pacotes** (dias/descontos)
- **Taxa de embalagem** ou custos fixos por marmita
- Possibilidade de salvar as configuracoes para nao ter que ajustar toda vez

## O que vai mudar

### 1. Secao "Regras de Precificacao" (expansivel, acima da tabela de itens)

Um card colapsavel com todas as configuracoes de preco, dividido em abas ou blocos:

**Bloco A - Custos:**
- Custo por grama dos ingredientes (R$) — o quanto GASTA em media por grama de comida
- Taxa fixa por embalagem (R$) — custo da embalagem (marmita, tampa, etiqueta)
- Custo fixo por refeicao (R$) — gas, mao de obra, etc (rateio)

**Bloco B - Margem e Preco de Venda:**
- Margem de lucro desejada (%) — ex: 50%, 100%, 200%
- OU preco de venda por grama (R$) — o admin escolhe se quer calcular pela margem ou definir direto
- Toggle: "Calcular pelo custo + margem" ou "Definir preco manual por grama"

**Bloco C - Pacotes (editavel):**
- Tabela editavel dos pacotes (hoje fixo no codigo):
  - Dias | Label | Desconto (%)
  - Botao para adicionar/remover pacotes
  - Ex: 7 dias / 0% | 14 dias / 5% | 21 dias / 8% | 28 dias / 10%

**Bloco D - Salvar Configuracao:**
- Botao "Salvar como padrao" que persiste no banco para o tenant
- Ao abrir a aba, carrega as configuracoes salvas automaticamente

### 2. Resumo financeiro aprimorado

Apos calcular o orcamento, o resumo mostra:
- **Custo total estimado** por refeicao (custo ingredientes + embalagem + fixo)
- **Preco de venda** por refeicao
- **Lucro por refeicao** (venda - custo)
- **Margem real** (%)
- Para cada pacote: custo total, venda total, lucro total

Isso fica visivel APENAS para o admin (nao vai no WhatsApp nem no PDF para o cliente).

### 3. O que o cliente ve (WhatsApp/PDF) continua limpo

- Apenas preco final por item e totais dos pacotes
- Nenhuma informacao de custo ou margem

## Detalhes tecnicos

### Nova tabela: `tenant_diet_pricing` (configuracao por tenant)

```
tenant_diet_pricing
- id UUID PK
- tenant_id UUID FK (unique - 1 config por tenant)
- cost_per_gram NUMERIC DEFAULT 0.04
- packaging_cost NUMERIC DEFAULT 1.50
- fixed_cost_per_meal NUMERIC DEFAULT 2.00
- pricing_mode TEXT DEFAULT 'margin' (ou 'manual')
- margin_percent NUMERIC DEFAULT 100
- manual_price_per_gram NUMERIC DEFAULT 0.08
- package_options JSONB DEFAULT '[{"days":7,"label":"7 dias","discount":0},...]'
- created_at / updated_at
```

### Alteracoes no CustomDietQuoter.tsx

1. Adicionar state para todas as configs de precificacao
2. Carregar configs do banco ao montar (`tenant_diet_pricing`)
3. Novo componente interno `PricingConfig` (card colapsavel)
4. Atualizar `getItemPrice()` para usar o modo correto (margem ou manual)
5. Adicionar calculo de custo: `getItemCost(item) = item.totalWeight * costPerGram + packagingCost + fixedCost`
6. Resumo financeiro com colunas de custo/venda/lucro
7. Botao "Salvar como padrao" faz upsert na tabela `tenant_diet_pricing`

### Logica de preco

```
Se modo = 'margin':
  custoItem = (peso * custoGrama) + embalagem + custoFixo
  precoVenda = custoItem * (1 + margem/100)

Se modo = 'manual':
  precoVenda = peso * precoManualGrama
  custoItem = (peso * custoGrama) + embalagem + custoFixo (so para exibir lucro)
```

### Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| Nova migracao SQL | Criar tabela `tenant_diet_pricing` com RLS por tenant |
| `src/components/admin/CustomDietQuoter.tsx` | Adicionar secao de precificacao, carregar/salvar configs, resumo financeiro |

### RLS

```sql
CREATE POLICY "tenant_isolation" ON tenant_diet_pricing
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

