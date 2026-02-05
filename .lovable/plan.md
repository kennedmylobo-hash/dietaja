

# Plano: Sistema de Clientes Recorrentes

## Objetivo

Criar um sistema para cadastrar **clientes fixos** que fazem pedidos em dias específicos da semana (toda segunda, toda terça, etc.), garantindo que você nunca esqueça de preparar os pedidos deles.

## Como vai funcionar

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ABA "RECORRENTES" NO ADMIN                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📅 HOJE: QUARTA-FEIRA                                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 🔔 ENTREGAS DE HOJE (3)                                     │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ ✓ Maria Silva        | 10x Marmitas Fit    | Delivery       │    │
│  │ ✓ João Santos        | 5x Marmitas         | Retirada       │    │
│  │ ○ Ana Costa          | Kit Detox 5 dias    | Delivery       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 📋 TODOS OS CLIENTES RECORRENTES                            │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ Cliente        | Dia       | Pedido Padrão    | Ativo       │    │
│  │ Maria Silva    | Quarta    | 10x Marmitas Fit | ✅          │    │
│  │ João Santos    | Quarta    | 5x Marmitas      | ✅          │    │
│  │ Ana Costa      | Quarta    | Kit Detox 5 dias | ✅          │    │
│  │ Carlos Lima    | Segunda   | 8x Marmitas      | ✅          │    │
│  │ Paula Mendes   | Sexta     | 15x Marmitas     | ⏸️          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  [+ Adicionar Cliente Recorrente]                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Funcionalidades

### 1. Cadastro de Cliente Recorrente
- Nome, telefone, email
- **Dia da semana** para entrega (Segunda, Terça, Quarta, etc.)
- **Pedido padrão** (descrição do que sempre pede)
- Opção de delivery ou retirada
- Endereço (se delivery)
- Observações
- Status ativo/inativo (para pausar temporariamente)

### 2. Lista de Entregas do Dia
- Mostrar automaticamente quem precisa receber **hoje**
- Checkbox para marcar como "preparado" ou "entregue"
- Destaque visual para os clientes do dia atual

### 3. Visão Semanal
- Ver todos os clientes organizados por dia da semana
- Contador de quantos clientes em cada dia

---

## Estrutura do Banco de Dados

**Nova tabela: `recurring_customers`**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| customer_name | TEXT | Nome do cliente |
| customer_phone | TEXT | Telefone |
| customer_email | TEXT | Email (opcional) |
| delivery_day | TEXT | Dia da semana (monday, tuesday, etc.) |
| default_order | TEXT | Descrição do pedido padrão |
| delivery_option | TEXT | 'delivery' ou 'retirada' |
| delivery_address | TEXT | Endereço (se delivery) |
| notes | TEXT | Observações |
| is_active | BOOLEAN | Se está ativo ou pausado |
| last_delivered_at | TIMESTAMPTZ | Última entrega realizada |
| created_at | TIMESTAMPTZ | Data de cadastro |

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/admin/RecurringCustomers.tsx` | Componente principal com lista e formulário |
| Migration SQL | Criar tabela `recurring_customers` |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/AdminSidebar.tsx` | Adicionar item "Recorrentes" no menu |
| `src/pages/Admin.tsx` | Renderizar novo componente |

---

## Interface do Componente

### Seção "Entregas de Hoje"
- Cards destacados com os clientes que precisam receber hoje
- Botão "Marcar como Entregue" que atualiza `last_delivered_at`
- Botão para abrir WhatsApp com mensagem pronta

### Seção "Todos os Clientes"
- Tabela com todos os clientes recorrentes
- Filtro por dia da semana
- Botões: Editar, Pausar/Ativar, Excluir
- Badge colorido indicando o dia da semana

### Modal de Cadastro/Edição
- Formulário com todos os campos
- Seletor de dia da semana com visual amigável
- Validação de campos obrigatórios

---

## Fluxo de Uso

1. **Administrador acessa aba "Recorrentes"**
2. **Vê imediatamente** os clientes que precisam de entrega hoje
3. **Marca como entregue** conforme vai preparando
4. **Cadastra novos clientes** quando necessário
5. **Pausa clientes** que não vão pedir naquela semana

---

## Benefícios

- **Nunca esquecer** um cliente fixo
- **Visão clara** do que precisa preparar cada dia
- **Histórico** de última entrega para cada cliente
- **Flexibilidade** para pausar temporariamente

