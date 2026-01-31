

## Plano: Carrinho em Tempo Real + Criação Automática de Conta

### Contexto
Atualmente:
1. **Carrinhos** - A tabela `carts` armazena carrinhos com dados do cliente (nome, telefone, email, itens), mas o admin só vê carrinhos "abandonados" ou "ativos" na aba "Recuperar"
2. **Contas de cliente** - A criação de conta é **opcional** via checkbox "Salvar meus dados para próximas compras" no checkout
3. **Admin "Ao Vivo"** - Mostra visitantes online e eventos de analytics, mas NÃO mostra carrinhos em tempo real

### Objetivo
1. Criar um novo componente no Admin que exiba **carrinhos ativos em tempo real** com itens, valores e dados do cliente
2. **Automatizar a criação de conta** sempre que um pedido for confirmado (sem depender do checkbox)

---

### Funcionalidade 1: Visualização de Carrinhos em Tempo Real

**Novo componente:** `src/components/admin/LiveCarts.tsx`

Características:
- Exibe carrinhos com status "active" ordenados por última atividade
- Atualização em tempo real via Supabase Realtime (já habilitado na tabela `carts`)
- Mostra: nome do cliente, telefone, itens no carrinho, valor total, tempo desde última atividade
- Card expandível para ver detalhes dos itens e sabores selecionados
- Indicador visual de "adicionando agora" quando a atividade é recente (< 2 min)
- Botão para abrir WhatsApp diretamente

**Integração no Admin:**
- Adicionar `LiveCarts` dentro da aba "Ao Vivo" (`LiveVisitors.tsx` ou diretamente no `Admin.tsx`)
- Ou criar uma nova aba específica "Carrinhos" ao lado de "Ao Vivo"

**Dados exibidos por carrinho:**
```
┌─────────────────────────────────────────────────────────┐
│ 🟢 Elton                         R$ 600,87              │
│ 📱 77988254159                   há 2 min               │
│ ─────────────────────────────────────────────────────── │
│ • 21x Combo Hipertrofia 21 (marmita)                    │
│   Sabores: Carne moída c/ arroz (2), Frango grelhado... │
│ ─────────────────────────────────────────────────────── │
│ [💬 WhatsApp]                                           │
└─────────────────────────────────────────────────────────┘
```

---

### Funcionalidade 2: Criação Automática de Conta

**Modificação:** `src/components/CartDrawer.tsx`

Na função `handleConfirmOrder()`, após criar o pedido com sucesso:
1. **Remover a condição** `if (!saveData) return` da função `createCustomerAccount`
2. **Sempre chamar** `createCustomerAccount` quando o pedido for confirmado
3. Manter o checkbox como informativo ("Seus dados serão salvos automaticamente")

**Ou alternativa mais elegante:**
- Criar a conta **no backend** dentro da Edge Function `create-asaas-pix` ou um trigger no banco
- Isso garante que mesmo pedidos via WhatsApp tenham conta criada

**Modificação sugerida (frontend):**

```typescript
// Antes (CartDrawer.tsx linha 188)
const createCustomerAccount = async (data: FormData) => {
  if (!saveData) return;  // ← REMOVER ESTA LINHA
  ...
}

// handleConfirmOrder já chama createCustomerAccount
```

**Ou via Backend (preferível):**
Criar um trigger SQL ou modificar a Edge Function para:
1. Quando um pedido for inserido com status `awaiting_payment` ou `approved`
2. Verificar se já existe perfil para o email/telefone
3. Se não existir, criar automaticamente

---

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/admin/LiveCarts.tsx` | Criar componente de carrinhos em tempo real |
| `src/components/admin/LiveVisitors.tsx` | Modificar para incluir LiveCarts ou... |
| `src/pages/Admin.tsx` | Adicionar LiveCarts na aba "Ao Vivo" |
| `src/components/CartDrawer.tsx` | Remover condição `if (!saveData)` para criar conta automaticamente |

---

### Detalhes Técnicos

**LiveCarts.tsx - Estrutura básica:**

```typescript
// Hook para carrinhos em tempo real
const useLiveCarts = () => {
  const [carts, setCarts] = useState([]);
  
  useEffect(() => {
    // Fetch inicial
    fetchActiveCarts();
    
    // Subscription realtime
    const channel = supabase
      .channel('live-carts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'carts',
        filter: 'status=eq.active'
      }, () => fetchActiveCarts())
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, []);
  
  return { carts };
};
```

**Criação automática de conta - Lógica:**

```typescript
// CartDrawer.tsx - handleConfirmOrder (após criar pedido)
// Sempre criar/atualizar conta com os dados do checkout
await createCustomerAccount(formData);

// createCustomerAccount já faz upsert:
// - Se usuário existe: atualiza profile
// - Se não existe: cria user + profile + envia magic link
```

---

### Fluxo Final

**Carrinho em Tempo Real:**
```
Cliente adiciona item → Cart salvo no banco → 
Realtime dispara → Admin vê carrinho aparecer instantaneamente
```

**Criação Automática de Conta:**
```
Cliente confirma pedido → Pedido criado no banco →
Conta criada/atualizada → Magic link enviado por email →
Cliente pode acessar histórico de pedidos futuramente
```

---

### Benefícios

| Antes | Depois |
|-------|--------|
| Admin não vê carrinhos em tempo real | Carrinhos aparecem instantaneamente |
| Conta criada só se cliente marcar checkbox | Conta sempre criada automaticamente |
| Difícil acompanhar cliente navegando | Pode ver cliente montando carrinho e intervir via WhatsApp |

