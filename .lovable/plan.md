

# Plano: Menu Lateral para Painel Admin

## Problema Atual

O painel Admin possui **13 abas** em uma barra horizontal com scroll:
- Ao Vivo, Analytics, Funil, Pedidos, Recuperar, Marketing, Notificações, Erros PIX, Estoque, Histórico, Cardápio, Produção, Importar

Isso dificulta a navegação pois:
- Precisa fazer scroll horizontal para ver todas
- Em telas menores, os nomes ficam escondidos (só ícones)
- Não é possível ter uma visão geral de todas as opções

---

## Solução: Sidebar com Menu Lateral

Transformar a navegação de abas para uma **sidebar fixa à esquerda** no estilo iFood/Spotify:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Painel Dieta Já                                    [Filtros] [Logout] │
├───────────────────┬────────────────────────────────────────────────────┤
│                   │                                                    │
│ 📊 OPERAÇÕES      │    ┌─────────────────────────────────────────┐    │
│                   │    │                                         │    │
│   📻 Ao Vivo  ●   │    │        CONTEÚDO DA SEÇÃO ATIVA         │    │
│   📦 Pedidos      │    │                                         │    │
│   👨‍🍳 Produção     │    │    (LiveVisitors, OrdersManager, etc)   │    │
│   📥 Importar     │    │                                         │    │
│                   │    └─────────────────────────────────────────┘    │
│ ─────────────     │                                                    │
│ 📈 ANALYTICS      │                                                    │
│                   │                                                    │
│   📊 Analytics    │                                                    │
│   🔄 Funil        │                                                    │
│                   │                                                    │
│ ─────────────     │                                                    │
│ ⚙️ GESTÃO         │                                                    │
│                   │                                                    │
│   🍽️ Cardápio     │                                                    │
│   📦 Estoque      │                                                    │
│   📜 Histórico    │                                                    │
│                   │                                                    │
│ ─────────────     │                                                    │
│ 📣 MARKETING      │                                                    │
│                   │                                                    │
│   📢 Campanhas    │                                                    │
│   🔔 Notificações │                                                    │
│   🔁 Recuperar    │                                                    │
│                   │                                                    │
│ ─────────────     │                                                    │
│ ⚠️ ERROS         │                                                    │
│                   │                                                    │
│   💳 Erros PIX    │                                                    │
│                   │                                                    │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## Características do Menu

### Agrupamento por Categoria
| Categoria | Itens |
|-----------|-------|
| **Operações** | Ao Vivo, Pedidos, Produção, Importar |
| **Analytics** | Analytics, Funil |
| **Gestão** | Cardápio, Estoque, Histórico |
| **Marketing** | Campanhas, Notificações, Recuperar |
| **Erros** | Erros PIX |

### Comportamento Responsivo
- **Desktop**: Sidebar fixa de 240px, sempre visível
- **Mobile**: Sidebar colapsada em ícones (60px) com tooltip no hover, ou drawer que abre por gesto

### Indicadores Visuais
- Item ativo: fundo colorido + borda lateral
- "Ao Vivo": bolinha verde pulsante (como já tem)
- Contadores: badge numérico para pedidos pendentes/erros

---

## Alterações Técnicas

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Admin.tsx` | Substituir Tabs por layout com Sidebar |
| `src/components/admin/AdminSidebar.tsx` | CRIAR novo componente |

### Estrutura do AdminSidebar

```typescript
interface AdminMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  pulse?: boolean; // para "Ao Vivo"
}

interface AdminMenuGroup {
  title: string;
  items: AdminMenuItem[];
}

const menuGroups: AdminMenuGroup[] = [
  {
    title: "Operações",
    items: [
      { id: "live", label: "Ao Vivo", icon: Radio, pulse: true },
      { id: "orders", label: "Pedidos", icon: Package },
      { id: "production", label: "Produção", icon: ChefHat },
      { id: "whatsapp-import", label: "Importar", icon: MessageCircle },
    ]
  },
  {
    title: "Analytics",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "funnel", label: "Funil", icon: Activity },
    ]
  },
  // ... outros grupos
];
```

### Layout Principal (Admin.tsx)

```tsx
<div className="min-h-screen bg-background flex">
  {/* Sidebar fixa */}
  <AdminSidebar 
    activeSection={activeSection} 
    onSectionChange={setActiveSection} 
  />
  
  {/* Conteúdo principal */}
  <div className="flex-1 ml-60">
    <header>...</header>
    <main>
      {activeSection === "live" && <LiveVisitors />}
      {activeSection === "orders" && <OrdersManager />}
      {/* ... */}
    </main>
  </div>
</div>
```

---

## Comportamento Mobile

No mobile, a sidebar se transforma em um **bottom drawer** ou **hamburger menu**:

```text
┌─────────────────────────────────────────┐
│ ≡ Painel Dieta Já         [🔍] [👤]    │
├─────────────────────────────────────────┤
│                                         │
│        CONTEÚDO DA SEÇÃO ATIVA          │
│                                         │
├─────────────────────────────────────────┤
│ 📻  │  📦  │  👨‍🍳  │  📊  │  ⋯       │  <- Navegação inferior
└─────────────────────────────────────────┘
```

---

## Vantagens da Mudança

1. **Visibilidade total**: Todas as 13 opções visíveis sem scroll
2. **Organização lógica**: Grupos de funcionalidades relacionadas
3. **Navegação rápida**: Um clique para qualquer seção
4. **Indicadores visuais**: Badges e pulsos para informações importantes
5. **Consistência**: Mesmo padrão do CardapioSidebar

---

## Resultado Esperado

Ao abrir o Admin, o usuário verá imediatamente todas as opções organizadas em categorias na lateral esquerda, podendo navegar rapidamente para qualquer seção sem precisar fazer scroll horizontal.

