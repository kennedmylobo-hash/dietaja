

## Plano: Página de Perfil do Cliente

### Contexto Atual
1. **Autenticação de clientes** - Contas são criadas automaticamente via edge function `create-customer-account` (magic link)
2. **Tabela `profiles`** - Armazena: `user_id`, `name`, `email`, `phone`, `preferred_delivery_option`, `preferred_address`
3. **Tabela `orders`** - Não tem `user_id`, mas tem `customer_email` que pode ser vinculado ao perfil
4. **RLS em `orders`** - Admins veem tudo; anônimos veem pedidos criados nos últimos 5 minutos
5. **RLS em `profiles`** - Usuários podem ver/editar apenas seu próprio perfil

### O Que Será Implementado

#### 1. Nova Página `/perfil` (ou `/minha-conta`)

**Arquivo:** `src/pages/MinhaConta.tsx`

**Funcionalidades:**
- Tela de login via magic link (se não logado)
- Dashboard com dados do perfil e histórico de pedidos
- Edição de dados pessoais (nome, telefone, endereço preferido)
- Lista de todos os pedidos do cliente com status em tempo real
- Botão de logout

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ 🏠 Logo              Minha Conta                [Sair]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Olá, Larissa! 👋                                       │
│  larissa@email.com | (73) 98218-4352                   │
│                                                         │
│  [✏️ Editar Dados]                                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  📦 Meus Pedidos                                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ #DJA-0078  •  31/01/2026                        │   │
│  │ 🟢 Aprovado  •  R$ 286,00                       │   │
│  │ 7x Marmita Emagrecimento                        │   │
│  │ [Ver Detalhes] [Acompanhar]                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ #DJA-0065  •  15/01/2026                        │   │
│  │ ✅ Entregue  •  R$ 143,00                       │   │
│  │ 3x Kit Detox                                    │   │
│  │ [Ver Detalhes]                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

#### 2. Atualização de RLS para Pedidos

**Problema atual:** Clientes não conseguem ver seus próprios pedidos antigos (RLS só permite ver pedidos dos últimos 5 minutos).

**Nova policy no `orders`:**
```sql
-- Clientes podem ver seus próprios pedidos (por email)
CREATE POLICY "Customers can view their own orders by email"
ON public.orders FOR SELECT
TO authenticated
USING (
  customer_email = (
    SELECT email FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);
```

---

#### 3. Tela de Login com Magic Link

**Fluxo:**
1. Cliente acessa `/minha-conta`
2. Se não logado, exibe campo de email
3. Cliente digita email e clica "Enviar link de acesso"
4. Sistema envia magic link via Supabase Auth
5. Cliente clica no link e é redirecionado para `/minha-conta` já logado

**Código:**
```typescript
const handleLoginRequest = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/minha-conta`,
    },
  });
};
```

---

#### 4. Hook de Autenticação Reutilizável

**Novo arquivo:** `src/hooks/useAuth.ts`

```typescript
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener primeiro
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Depois busca sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
};
```

---

#### 5. Link no Header/Footer

**Modificar:** Header da landing page ou adicionar no drawer do carrinho

- Link "Minha Conta" visível para todos
- Se logado, mostra nome do cliente
- Se não logado, leva para tela de login

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/MinhaConta.tsx` | Criar página de perfil do cliente |
| `src/hooks/useAuth.ts` | Criar hook de autenticação |
| `src/App.tsx` | Adicionar rota `/minha-conta` |
| `src/components/CartDrawer.tsx` | Adicionar link "Minha Conta" |
| Migração SQL | Adicionar RLS policy para clientes verem seus pedidos |

---

### Detalhes Técnicos

**MinhaConta.tsx - Estrutura:**

```typescript
const MinhaConta = () => {
  const { user, session, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // Se não logado, mostrar tela de login
  if (!session && !loading) {
    return <LoginScreen />;
  }
  
  // Buscar perfil e pedidos
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrders();
    }
  }, [user]);
  
  // Renderizar dashboard
  return (
    <div>
      <ProfileCard profile={profile} onEdit={...} />
      <OrdersList orders={orders} />
    </div>
  );
};
```

**Busca de pedidos:**

```typescript
const fetchOrders = async () => {
  const { data } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  setOrders(data || []);
};
```

---

### Fluxo Completo

```
1. Cliente faz primeiro pedido → Conta criada automaticamente
2. Magic link enviado por email
3. Cliente clica no link → Logado automaticamente
4. Cliente acessa /minha-conta → Vê histórico de pedidos
5. Cliente pode editar dados pessoais
6. Próximo pedido: dados pré-preenchidos no checkout
```

---

### Benefícios

| Antes | Depois |
|-------|--------|
| Cliente não tem acesso ao histórico | Histórico completo de pedidos |
| Sem área logada para clientes | Dashboard pessoal |
| Dados digitados toda vez | Dados salvos e pré-preenchidos |
| Sem rastreamento de pedidos | Status em tempo real |
| Difícil fidelizar cliente | Cliente com conta = recompra facilitada |

---

### Segurança

1. **Autenticação via Magic Link** - Sem senha, mais seguro
2. **RLS por email** - Cliente só vê seus próprios pedidos
3. **Sessão persistente** - Token gerenciado pelo Supabase
4. **Validação no servidor** - Profile só acessível pelo dono

