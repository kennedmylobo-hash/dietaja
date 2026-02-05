
# Plano Completo: 5 Melhorias para o Sistema

## Visão Geral

Vamos implementar 5 melhorias significativas:

| # | Melhoria | Esforço |
|---|----------|---------|
| 1 | Dashboard de KPIs | Médio |
| 2 | Histórico + Repetir Pedido | Médio |
| 3 | Sistema de Avaliações | Alto |
| 4 | Etiquetas para Produção | Médio |
| 5 | Campanhas de Recompra Automáticas | Já existe (melhorar) |

---

## 1. Dashboard de KPIs no Admin

**Objetivo:** Criar um painel consolidado com métricas de receita, pedidos e ticket médio.

**Nova Seção:** `KPIDashboard` no menu "Analytics"

### Métricas Principais (Cards)
- **Receita Total** (dia/semana/mês)
- **Número de Pedidos**
- **Ticket Médio**
- **Taxa de Conversão** (leads → pedidos)
- **Receita por Categoria** (Marmitas vs Kits Detox)

### Gráficos
- **Receita diária** (linha/área)
- **Pedidos por status** (pizza)
- **Top 5 produtos mais vendidos**
- **Comparativo período anterior** (% crescimento)

### Arquivos a Criar
- `src/components/admin/KPIDashboard.tsx`

### Dados Necessários
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as orders,
  SUM(total) as revenue,
  AVG(total) as avg_ticket
FROM orders 
WHERE status NOT IN ('cancelled', 'pending')
GROUP BY DATE(created_at)
ORDER BY date DESC
```

---

## 2. Histórico de Pedidos + Repetir Pedido

**Objetivo:** Melhorar página "Minha Conta" com histórico completo e botão de recompra.

### Funcionalidades
- Exibir **todos os pedidos** do cliente (paginado)
- Botão **"Repetir Pedido"** que:
  1. Adiciona os mesmos itens ao carrinho
  2. Mantém sabores e quantidades
  3. Redireciona para checkout

### Arquivos a Modificar
- `src/pages/MinhaConta.tsx`
  - Adicionar botão "Repetir Pedido"
  - Implementar função `handleRepeatOrder()`

### Lógica do Repetir Pedido
```typescript
const handleRepeatOrder = (order: Order) => {
  // Para cada item do pedido
  order.items.forEach(item => {
    addItem({
      type: item.type,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      flavors: item.flavors,
    });
  });
  
  // Redireciona para o checkout
  navigate('/cardapio');
  toast({ title: "Itens adicionados ao carrinho!" });
};
```

---

## 3. Sistema de Avaliações

**Objetivo:** Coletar feedback dos clientes após entrega.

### Estrutura do Banco

**Nova tabela: `reviews`**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  customer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Fluxo Completo

```text
+-------------------+     +------------------+     +------------------+
| Pedido Entregue   | --> | WhatsApp c/ Link | --> | Página Avaliação |
+-------------------+     +------------------+     +------------------+
                                                           |
                                                           v
                                                  +------------------+
                                                  | Salva no Banco   |
                                                  +------------------+
                                                           |
                                                           v
                                                  +------------------+
                                                  | Admin aprova e   |
                                                  | exibe no site    |
                                                  +------------------+
```

### Arquivos a Criar
1. **Página pública:** `src/pages/Avaliar.tsx`
   - Formulário com estrelas (1-5) e comentário
   - Rota: `/avaliar/:orderToken`
   
2. **Componente Admin:** `src/components/admin/ReviewsManager.tsx`
   - Lista de avaliações pendentes
   - Aprovar/Rejeitar
   - Estatísticas (média, total)

3. **Edge Function:** Já existe `send-review-request` - apenas ajustar link

### Token de Avaliação
Gerar token único por pedido para evitar avaliações falsas:
```typescript
const reviewToken = btoa(`${orderId}:${customerEmail}`);
const reviewUrl = `https://dietajavca.com.br/avaliar/${reviewToken}`;
```

---

## 4. Etiquetas para Produção (PDF)

**Objetivo:** Gerar etiquetas com nome do cliente e itens para colar nas embalagens.

### Layout da Etiqueta

```text
+---------------------------+
| DIETA JÁ                  |
+---------------------------+
| Cliente: MARIA SILVA      |
| Pedido: #DJA-0123         |
+---------------------------+
| ✓ 5x Frango Grelhado     |
| ✓ 3x Carne Moída          |
| ✓ 2x Kit Detox 3 Dias     |
+---------------------------+
| 📍 Delivery - Candeias    |
+---------------------------+
```

### Tamanhos Suportados
- **A7** (74 x 105mm) - Padrão
- **Térmica 80mm** - Para impressoras de etiquetas

### Arquivos a Criar/Modificar
1. **Novo:** `src/lib/label-utils.ts` - Geração de PDF com etiquetas
2. **Modificar:** `src/components/admin/ProductionPanel.tsx` - Botão "Imprimir Etiquetas"

### Implementação
Usar biblioteca `jspdf` para gerar PDF:
```typescript
import jsPDF from 'jspdf';

const generateLabels = (orders: Order[]) => {
  const doc = new jsPDF({ format: 'a7', orientation: 'landscape' });
  
  orders.forEach((order, index) => {
    if (index > 0) doc.addPage();
    
    doc.setFontSize(16);
    doc.text('DIETA JÁ', 10, 10);
    doc.setFontSize(12);
    doc.text(`Cliente: ${order.customer_name}`, 10, 25);
    doc.text(`Pedido: #${order.order_number}`, 10, 35);
    // ... itens
  });
  
  doc.save('etiquetas.pdf');
};
```

---

## 5. Melhorar Campanhas de Recompra

**Status Atual:** Já existe `send-recompra-campaigns` mas precisa de melhorias.

### Melhorias Propostas

1. **Dashboard de Campanhas no Admin**
   - Ver campanhas enviadas
   - Taxa de conversão (cupom usado)
   - Próximos envios programados

2. **Novos Triggers**
   - **7 dias** após entrega → Lembrete
   - **14 dias** → Cupom 5%
   - **30 dias** → Cupom 10% (sentimos sua falta)
   - **Aniversário** → Cupom especial

3. **Segmentação RFM**
   - Recency: Dias desde última compra
   - Frequency: Número de pedidos
   - Monetary: Valor total gasto

### Arquivos a Modificar
- `src/components/admin/MarketingManager.tsx` - Adicionar aba de campanhas
- `supabase/functions/send-recompra-campaigns/index.ts` - Melhorar lógica

---

## Dependências a Instalar

```bash
npm install jspdf
```

---

## Ordem de Implementação

| Fase | Tarefas | Arquivos |
|------|---------|----------|
| **1** | Dashboard KPIs | `KPIDashboard.tsx`, `AdminSidebar.tsx`, `Admin.tsx` |
| **2** | Repetir Pedido | `MinhaConta.tsx` |
| **3** | Tabela reviews + Página avaliar | Migration SQL, `Avaliar.tsx` |
| **4** | Admin de avaliações | `ReviewsManager.tsx` |
| **5** | Etiquetas PDF | `label-utils.ts`, `ProductionPanel.tsx` |
| **6** | Dashboard campanhas | `MarketingManager.tsx` |

---

## Resumo de Criação de Arquivos

### Novos Arquivos (6)
1. `src/components/admin/KPIDashboard.tsx`
2. `src/components/admin/ReviewsManager.tsx`
3. `src/pages/Avaliar.tsx`
4. `src/lib/label-utils.ts`
5. Migration SQL para tabela `reviews`
6. Atualização de rotas em `App.tsx`

### Arquivos Modificados (5)
1. `src/pages/MinhaConta.tsx` - Botão repetir pedido
2. `src/components/admin/AdminSidebar.tsx` - Novos itens menu
3. `src/pages/Admin.tsx` - Render novos componentes
4. `src/components/admin/ProductionPanel.tsx` - Botão etiquetas
5. `src/components/admin/MarketingManager.tsx` - Dashboard campanhas
