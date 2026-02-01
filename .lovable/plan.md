
# Plano: Adicionar Botão "Cancelar Todos" para Pedidos Órfãos

## Objetivo

Adicionar um botão "Cancelar Todos" ao alerta de pedidos órfãos detectados, permitindo cancelar todos os pedidos pendentes de um cliente específico com uma única confirmação.

---

## Como Vai Funcionar

```text
Alerta Atual:
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️ Potenciais Pedidos Órfãos Detectados                         │
│ 1 cliente tem múltiplos pedidos pendentes...                    │
│                                                                  │
│ [16 pedidos] kennedy (kennedmylobo@gmail.com)                   │
│ #DJA-0106, #DJA-0105, #DJA-0102...                              │
└──────────────────────────────────────────────────────────────────┘

Alerta Novo (com botão):
┌──────────────────────────────────────────────────────────────────┐
│ ⚠️ Potenciais Pedidos Órfãos Detectados                         │
│ 1 cliente tem múltiplos pedidos pendentes...                    │
│                                                                  │
│ [16 pedidos] kennedy (kennedmylobo@gmail.com)                   │
│ #DJA-0106, #DJA-0105, #DJA-0102...                              │
│                                                                  │
│                              [🚫 Cancelar Todos os 16 Pedidos]  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Uso

1. Admin vê o alerta com pedidos órfãos
2. Clica em "Cancelar Todos os X Pedidos"
3. Aparece um **AlertDialog de confirmação** perguntando:
   - "Deseja cancelar todos os **16 pedidos** pendentes de **kennedy**?"
   - Lista os pedidos que serão cancelados
   - Campo para motivo opcional
4. Ao confirmar:
   - Cancela pagamento no Asaas para cada pedido (em paralelo)
   - Atualiza status para `cancelled` com `cancellation_type: 'manual_bulk'`
   - Registra no histórico com nota "Cancelamento em lote"
   - Atualiza lista em tempo real

---

## Alterações Técnicas

### Arquivo: `src/components/admin/OrdersManager.tsx`

**1. Adicionar estados para controle do modal de cancelamento em lote:**

```typescript
const [bulkCancelCustomer, setBulkCancelCustomer] = useState<{
  email: string;
  name: string;
  orders: Order[];
} | null>(null);
const [isBulkCancelling, setIsBulkCancelling] = useState(false);
```

**2. Criar função `cancelAllOrphanOrders`:**

```typescript
const cancelAllOrphanOrders = async (ordersToCancel: Order[], reason: string) => {
  setIsBulkCancelling(true);
  
  try {
    // Cancelar todos em paralelo
    const cancelPromises = ordersToCancel.map(async (order) => {
      // Cancelar no Asaas
      await supabase.functions.invoke('cancel-asaas-payment', {
        body: { order_id: order.id }
      }).catch(err => console.error('Asaas error:', err));
      
      // Atualizar no banco
      await supabase.from('orders').update({
        status: 'cancelled',
        cancellation_type: 'manual_bulk'
      }).eq('id', order.id);
      
      // Registrar histórico
      await recordStatusChange(order.id, order.status, 'cancelled', 
        reason || 'Cancelamento em lote de pedidos órfãos');
    });
    
    await Promise.all(cancelPromises);
    
    // Atualizar estado local
    setOrders(prev => prev.map(o => 
      ordersToCancel.find(c => c.id === o.id) 
        ? { ...o, status: 'cancelled' } 
        : o
    ));
    
    setBulkCancelCustomer(null);
  } finally {
    setIsBulkCancelling(false);
  }
};
```

**3. Adicionar botão e AlertDialog na UI do alerta:**

```tsx
{duplicateCustomers.map(({ email, customerName, count, orders }) => (
  <div key={email} className="...">
    {/* Conteúdo existente */}
    
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="mt-2"
        >
          <Ban className="w-3 h-3 mr-1" />
          Cancelar Todos os {count} Pedidos
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar {count} pedidos?</AlertDialogTitle>
          <AlertDialogDescription>
            Todos os pedidos pendentes de {customerName} serão cancelados.
            Os pagamentos PIX também serão cancelados no Asaas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Lista dos pedidos */}
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={() => cancelAllOrphanOrders(orders, '...')}>
            Sim, Cancelar Todos
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
))}
```

---

## Resumo

| Componente | Alteração |
|------------|-----------|
| `OrdersManager.tsx` | Nova função `cancelAllOrphanOrders` + AlertDialog com botão por cliente |

---

## Resultado Esperado

- Cada cliente com pedidos órfãos terá um botão "Cancelar Todos"
- Um clique abre confirmação com lista de pedidos
- Ao confirmar, todos são cancelados em paralelo (~1-2s)
- Pagamentos PIX são cancelados no Asaas automaticamente
- Histórico registra "Cancelamento em lote de pedidos órfãos"
