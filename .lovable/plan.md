
# Plano: Sistema de Produção e Melhorias no Cardápio

## Visão Geral

Este plano aborda três grandes áreas:
1. **Melhorias no Cardápio** - Emoji e detalhamento de pesos
2. **Importação de Pedidos via WhatsApp** - Parser de conversas
3. **Painel de Produção para Cozinha** - Agregação e impressão

---

## 1. Correção do Emoji "Melancia com Hortelã"

### Alteração no Banco de Dados
O suco "Suco Rosa" tem o emoji 🍇 (uva), mas o ingrediente é "melancia com hortelã". Será atualizado para 🍉 (melancia).

```sql
UPDATE kit_juices 
SET emoji = '🍉' 
WHERE name = 'Suco Rosa';
```

---

## 2. Pesos Detalhados nos Itens de Marmita

### Estrutura Proposta

Criar nova tabela para configurar acompanhamentos com seus pesos:

```text
┌───────────────────────────────────────────────────────────────┐
│ Configuração de Acompanhamentos (Admin)                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Acompanhamento      │ Peso (g)  │ Categoria                  │
│ ─────────────────────────────────────────────────────────────│
│ Arroz               │ [200]     │ [Carboidrato]              │
│ Feijão              │ [100]     │ [Leguminosa]               │
│ Legumes             │ [100]     │ [Vegetal]                  │
│ Salada de legumes   │ [100]     │ [Vegetal]                  │
│ Aipim               │ [150]     │ [Carboidrato]              │
│                                                               │
│ [+ Adicionar Acompanhamento]                [Salvar]          │
└───────────────────────────────────────────────────────────────┘
```

### Nova Tabela: `marmita_sides`
```sql
CREATE TABLE marmita_sides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weight_grams INTEGER NOT NULL DEFAULT 100,
  category TEXT DEFAULT 'acompanhamento',
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dados iniciais
INSERT INTO marmita_sides (name, weight_grams, category) VALUES
  ('Arroz', 200, 'carboidrato'),
  ('Feijão', 100, 'leguminosa'),
  ('Legumes', 100, 'vegetal'),
  ('Salada de legumes', 100, 'vegetal'),
  ('Aipim', 150, 'carboidrato'),
  ('Batata-doce', 150, 'carboidrato'),
  ('Mix de salada', 100, 'vegetal'),
  ('Grãos', 100, 'leguminosa');
```

### Atualização na Tabela `marmita_flavors`
Adicionar campo JSON para armazenar os acompanhamentos de cada sabor:

```sql
ALTER TABLE marmita_flavors 
ADD COLUMN sides JSONB DEFAULT '[]'::jsonb;

-- Exemplo de valor:
-- [{"name": "Arroz", "weight": 200}, {"name": "Feijão", "weight": 100}]
```

### Interface no Admin (MenuManager)
Adicionar seletor de acompanhamentos para cada sabor:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Sabores de Marmita                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 🥩 Carnes                                                           │
│ ─────────────────────────────────────────────────────────────────── │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ Carne moída                                                   │   │
│ │ Acompanhamentos: [Arroz 200g ✓] [Feijão 100g ✓] [+ Adicionar] │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ Carne bovina em cubos                                         │   │
│ │ Acompanhamentos: [Aipim 150g ✓] [Salada 100g ✓] [+ Adicionar] │   │
│ └───────────────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────────┘
```

### Exibição no Cardápio/Pedido
Ao selecionar sabores, exibir com pesos:
```
• 2x Carne moída (150g) c/ arroz (200g) e feijão (100g)
• 3x Frango grelhado (150g) c/ batata-doce (150g) e legumes (100g)
```

---

## 3. Importação de Pedidos via WhatsApp

### Novo Componente: `WhatsAppOrderImporter`

Interface para colar conversa do WhatsApp e extrair pedido:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 📱 Importar Pedido do WhatsApp                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Cole a conversa do WhatsApp aqui:                                   │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ [Área de texto grande]                                        │   │
│ │                                                               │   │
│ │ Olá, quero fazer um pedido:                                   │
│ │ 5 marmitas de carne moída                                     │
│ │ 3 marmitas de frango grelhado                                 │
│ │ 2 sucos verdes                                                │
│ │ Entrega: Rua das Flores, 123                                  │
│ │ Nome: Maria Silva                                             │
│ │ WhatsApp: 77991234567                                         │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ [🔍 Analisar Conversa]                                              │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ Pedido Extraído:                                                    │
│                                                                     │
│ 👤 Cliente: Maria Silva                                             │
│ 📱 WhatsApp: (77) 99123-4567                                        │
│ 📍 Endereço: Rua das Flores, 123                                    │
│                                                                     │
│ Itens:                                                              │
│ • 5x Carne moída - R$ 134,50                                        │
│ • 3x Frango grelhado - R$ 80,70                                     │
│ • 2x Suco verde - R$ 25,00                                          │
│                                                                     │
│ Total: R$ 240,20                                                    │
│                                                                     │
│ [Corrigir Manualmente] [✅ Criar Pedido como WhatsApp Pendente]     │
└─────────────────────────────────────────────────────────────────────┘
```

### Parser de Texto

Lógica para extrair informações:
- Regex para detectar quantidades + nomes de produtos
- Busca fuzzy no catálogo (marmita_flavors, kit_packages)
- Extração de telefone (padrão brasileiro)
- Extração de endereço (após "entrega:", "endereço:", "enviar para:")
- Extração de nome (após "nome:", "cliente:")

### Arquivo: `src/components/admin/WhatsAppOrderImporter.tsx`

---

## 4. Painel de Produção para Cozinha

### Novo Componente: `ProductionPanel`

Agregação de todos os pedidos aprovados/em produção por item:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 👨‍🍳 Produção do Dia                                    [🖨️ Imprimir] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Filtros: [📅 Hoje ▼] [Status: Aprovados + Em Produção ▼]           │
│                                                                     │
│ ════════════════════════════════════════════════════════════════    │
│ 🥩 MARMITAS - CARNES                                    Total: 45   │
│ ════════════════════════════════════════════════════════════════    │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ Carne moída c/ arroz e feijão                                  │  │
│ │ 📊 Quantidade: 12 unidades                                     │  │
│ │ ⚖️ Proteína: 12 × 150g = 1.800g                                │  │
│ │ ⚖️ Arroz: 12 × 200g = 2.400g                                   │  │
│ │ ⚖️ Feijão: 12 × 100g = 1.200g                                  │  │
│ │                                                                │  │
│ │ Clientes: João (3), Maria (5), Pedro (4)                       │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ Carne bovina em cubos c/ aipim e salada                        │  │
│ │ 📊 Quantidade: 8 unidades                                      │  │
│ │ ⚖️ Proteína: 8 × 150g = 1.200g                                 │  │
│ │ ⚖️ Aipim: 8 × 150g = 1.200g                                    │  │
│ │ ⚖️ Salada: 8 × 100g = 800g                                     │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ════════════════════════════════════════════════════════════════    │
│ 🥤 SUCOS DETOX                                          Total: 24   │
│ ════════════════════════════════════════════════════════════════    │
│                                                                     │
│ │ 🥬 Suco Verde: 8 unidades                                      │  │
│ │ 🍉 Suco Rosa: 10 unidades                                      │  │
│ │ 🍊 Suco Amarelo: 6 unidades                                    │  │
│                                                                     │
│ ════════════════════════════════════════════════════════════════    │
│ 🥣 SOPAS                                                 Total: 12   │
│ ════════════════════════════════════════════════════════════════    │
│                                                                     │
│ │ 🎃 Sopa de Abóbora: 5 unidades                                 │  │
│ │ 🥔 Sopa de Aipim: 4 unidades                                   │  │
│ │ 🍠 Sopa de Batata-doce: 3 unidades                             │  │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ [📋 Compartilhar via WhatsApp]                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Lógica de Agregação

```typescript
// Agregação de pedidos para produção
interface ProductionItem {
  flavorName: string;
  category: string;
  totalQuantity: number;
  sides: { name: string; weightPerUnit: number; totalWeight: number }[];
  customers: { name: string; quantity: number }[];
}

// Agrupa todos os items.flavors de orders com status in ['approved', 'preparing']
```

---

## 5. Impressão de Ficha do Cliente

### Botão no Modal de Detalhes do Pedido

Adicionar botão "🖨️ Imprimir Ficha" que abre uma janela de impressão formatada:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         DIETA JÁ                                    │
│                      Ficha de Pedido                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Pedido: #DJA-0042                                                   │
│ Data: 04/02/2026 14:30                                              │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ CLIENTE                                                             │
│ Nome: Maria Silva                                                   │
│ WhatsApp: (77) 99123-4567                                           │
│ Email: maria@email.com                                              │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ ENTREGA                                                             │
│ [X] Delivery - Rua das Flores, 123 - Centro                         │
│ [ ] Retirada no Recreio                                             │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ ITENS                                                               │
│                                                                     │
│ • 5x Carne moída c/ arroz e feijão                                  │
│ • 3x Frango grelhado c/ batata-doce                                 │
│ • 2x Suco Verde                                                     │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ VALORES                                                             │
│ Subtotal: R$ 215,20                                                 │
│ Entrega: R$ 15,00                                                   │
│ TOTAL: R$ 230,20                                                    │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ [ ] Separado    [ ] Conferido    [ ] Entregue                       │
│                                                                     │
│ Assinatura: _______________________                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Função de Impressão
```typescript
const printOrderTicket = (order: Order) => {
  const printWindow = window.open('', '_blank');
  printWindow?.document.write(generateTicketHTML(order));
  printWindow?.print();
};
```

---

## 6. Compartilhar Produção via WhatsApp

Botão que formata os dados de produção para WhatsApp:

```text
👨‍🍳 *PRODUÇÃO DO DIA - 04/02/2026*

*🥩 MARMITAS*
• 12x Carne moída (arroz + feijão)
• 8x Carne em cubos (aipim + salada)
• 15x Frango grelhado (arroz + legumes)
• 10x Frango desfiado (feijão + salada)

*🥤 SUCOS DETOX*
• 8x Suco Verde
• 10x Suco Rosa
• 6x Suco Amarelo

*🥣 SOPAS*
• 5x Abóbora
• 4x Aipim
• 3x Batata-doce

📊 *TOTAL: 45 marmitas + 24 sucos + 12 sopas*
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | CRIAR | Tabela `marmita_sides` + coluna `sides` em `marmita_flavors` |
| Migração SQL | CRIAR | UPDATE emoji do Suco Rosa para 🍉 |
| `src/components/admin/WhatsAppOrderImporter.tsx` | CRIAR | Importador de pedidos via WhatsApp |
| `src/components/admin/ProductionPanel.tsx` | CRIAR | Painel de produção agregado |
| `src/components/admin/SidesManager.tsx` | CRIAR | Gerenciador de acompanhamentos |
| `src/components/admin/OrdersManager.tsx` | EDITAR | Adicionar botões de impressão |
| `src/components/admin/MenuManager.tsx` | EDITAR | Interface para configurar acompanhamentos por sabor |
| `src/pages/Admin.tsx` | EDITAR | Adicionar novas abas (Produção, Importar) |
| `src/lib/whatsapp-parser.ts` | CRIAR | Lógica de parsing de conversas |
| `src/lib/print-utils.ts` | CRIAR | Funções de impressão e formatação |

---

## Resumo das Funcionalidades

1. ✅ Emoji melancia corrigido no Suco Rosa
2. ✅ Sistema de acompanhamentos com pesos configuráveis
3. ✅ Exibição de pesos detalhados nos pedidos
4. ✅ Importador de pedidos via WhatsApp (ctrl+c ctrl+v)
5. ✅ Painel de produção com agregação por sabor
6. ✅ Cálculo automático de pesos totais para cozinha
7. ✅ Impressão de ficha individual do cliente
8. ✅ Impressão do resumo de produção
9. ✅ Compartilhamento via WhatsApp (formatado)

---

## Fluxo de Trabalho Final

```text
ENTRADA DE PEDIDOS                    PRODUÇÃO                      ENTREGA
──────────────────                    ────────                      ───────

┌─────────────┐                    ┌──────────────┐              ┌──────────┐
│ Checkout    │───┐                │ Painel       │              │ Imprimir │
│ Online      │   │                │ Produção     │              │ Ficha    │
└─────────────┘   │                │              │              │ Cliente  │
                  ├──▶ Pedidos ──▶│ • Agregar    │──▶ Cozinha ─▶│          │
┌─────────────┐   │      DB       │ • Totalizar  │   produz     │ Conferir │
│ WhatsApp    │───┘                │ • Imprimir   │              │ Entregar │
│ Import      │                    │ • WhatsApp   │              │          │
└─────────────┘                    └──────────────┘              └──────────┘
```
