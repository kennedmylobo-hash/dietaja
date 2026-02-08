
# Aba "Dieta Personalizada" - Calculadora de Orcamento Rapido

## O que vai ser criado

Uma nova aba no painel Admin chamada **"Dieta Personal."** que permite ao restaurante criar orcamentos rapidos para pedidos de dieta personalizada. O fluxo eh: o cliente manda a lista de itens pelo WhatsApp (como na imagem), o admin cola no sistema, e o orcamento eh calculado automaticamente.

## Como vai funcionar

1. **Textarea para colar a mensagem** do WhatsApp com a lista de itens da nutricionista
2. **Parser inteligente** que extrai automaticamente cada item com:
   - Numero do item (1, 2, 3...)
   - Descricao completa do prato
   - Ingredientes e pesos individuais (ex: "arroz com brocolis (60g)")
   - Peso total calculado automaticamente
3. **Tabela editavel** onde o admin pode:
   - Ajustar descricoes
   - Editar pesos
   - Definir preco por grama ou preco fixo por item
   - Adicionar/remover itens
4. **Configuracao de preco base** (ex: R$ 0,08/g) com possibilidade de ajuste por item
5. **Campo para nome do cliente e WhatsApp**
6. **Resumo do orcamento** com:
   - Preco unitario de cada item
   - Subtotal
   - Opcoes de pacote (7/14/21/28 unidades)
   - Total final
7. **Botao "Enviar pelo WhatsApp"** que gera mensagem formatada com o orcamento completo
8. **Botao "Salvar PDF"** usando jspdf (ja instalado) para gerar um orcamento profissional
9. **Historico de orcamentos** salvos no banco para consulta futura

## Exemplo de fluxo

```text
Admin cola:
"1- Strogonoff de grao de bico (100g) com arroz com brocolis (100g) + legumes variados (100g)
 2- Hamburguer de grao de bico com lentilha (120g) + macarrao ao molho branco (180g)
 3- File de tilapia (80g) + pure de aipim (120g) + legumes variados (100g)"

Sistema extrai:
| # | Descricao                                    | Peso Total | Preco    |
|---|----------------------------------------------|-----------|----------|
| 1 | Strogonoff de grao de bico + arroz + legumes | 300g      | R$ 24,00 |
| 2 | Hamburguer de grao de bico + macarrao        | 300g      | R$ 24,00 |
| 3 | File de tilapia + pure + legumes             | 300g      | R$ 24,00 |

Total por unidade: R$ 72,00
Kit 7 dias (7x cada): R$ 504,00
Kit 14 dias (14x cada): R$ 952,00 (com desconto)
```

## Detalhes tecnicos

### 1. Nova tabela no banco: `custom_diet_quotes`

```sql
CREATE TABLE custom_diet_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  price_per_gram NUMERIC(10,4) DEFAULT 0.08,
  subtotal_per_unit NUMERIC(10,2),
  package_options JSONB DEFAULT '[]',
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE custom_diet_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON custom_diet_quotes
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

### 2. Novo componente: `src/components/admin/CustomDietQuoter.tsx`

- Textarea para colar texto do WhatsApp
- Parser que usa regex para extrair itens numerados e pesos entre parenteses
- Tabela editavel com react state
- Configuracao de preco/grama com input numerico
- Calculo automatico de pacotes (7/14/21/28)
- Geracao de mensagem WhatsApp formatada
- Geracao de PDF com jspdf
- Lista de orcamentos anteriores salvos

### 3. Parser de itens personalizados

Regex para extrair:
- Numero do item: `/^\d+[-.)]\s*/`
- Ingredientes com peso: `/([^(]+)\((\d+)g?\)/g` -- captura nome e gramatura
- Peso total: soma de todas as gramaturas encontradas

### 4. Sidebar: adicionar item ao grupo "Operacoes"

```typescript
{ id: "custom-diet", label: "Dieta Personal.", icon: ClipboardList }
```

### 5. Admin.tsx: adicionar case no switch

```typescript
case "custom-diet":
  return <CustomDietQuoter />;
```

### 6. Multi-tenant

- Todos os orcamentos sao salvos com `tenant_id`
- O preco base por grama pode ser configuravel por tenant (campo na tabela `tenants` ou inline no componente)
- Historico filtrado por tenant via RLS
