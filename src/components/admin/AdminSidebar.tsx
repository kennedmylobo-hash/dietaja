import { cn } from "@/lib/utils";
import {
  Radio,
  Package,
  ChefHat,
  MessageCircle,
  BarChart3,
  Activity,
  UtensilsCrossed,
  Warehouse,
  History,
  Megaphone,
  Bell,
  RefreshCw,
  Menu,
  Gift,
   Users,
   TrendingUp,
   Star,
   CalendarClock,
   Store,
   Palette,
   Target,
  ShoppingCart,
    ClipboardList,
    type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  pulse?: boolean;
}

interface AdminMenuGroup {
  title: string;
  items: AdminMenuItem[];
}

const menuGroups: AdminMenuGroup[] = [
  {
    title: "Painel",
    items: [
      { id: "kpis", label: "Dashboard", icon: TrendingUp },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "funnel", label: "Funil", icon: Activity },
      { id: "live", label: "Ao Vivo", icon: Radio, pulse: true },
      { id: "ab-tests", label: "Teste A/B", icon: BarChart3 },
    ],
  },
  {
    title: "Pedidos",
    items: [
      { id: "orders", label: "Pedidos", icon: Package },
      { id: "production", label: "Produção", icon: ChefHat },
      { id: "whatsapp-import", label: "Importar", icon: MessageCircle },
      { id: "recovery", label: "Recuperar", icon: RefreshCw },
    ],
  },
  {
    title: "Clientes",
    items: [
      { id: "customers", label: "Base", icon: Users },
      { id: "personalized-diet", label: "Mensalistas", icon: CalendarClock },
      { id: "club", label: "Clube", icon: Star },
      { id: "custom-diet", label: "Dieta Personal.", icon: ClipboardList },
      { id: "reviews", label: "Avaliações", icon: Star },
    ],
  },
  {
    title: "Cardápio",
    items: [
      { id: "menu", label: "Cardápio", icon: UtensilsCrossed },
      { id: "stock", label: "Estoque", icon: Warehouse },
      { id: "history", label: "Histórico", icon: History },
      { id: "shopping-list", label: "Compras", icon: ShoppingCart },
    ],
  },
  {
    title: "Marketing",
    items: [
      { id: "marketing", label: "Campanhas", icon: Megaphone },
      { id: "referrals", label: "Indicações", icon: Gift },
      { id: "utm-report", label: "Campanhas UTM", icon: Target },
      { id: "notifications", label: "Notificações", icon: Bell },
    ],
  },
  {
    title: "Loja",
    items: [
      { id: "tenant-settings", label: "Dados", icon: Store },
      { id: "landing-editor", label: "Landing Page", icon: Palette },
    ],
  },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

function SidebarContent({
  activeSection,
  onSectionChange,
  onItemClick,
  brandName,
  newOrderCount,
  onNewOrdersSeen,
}: AdminSidebarProps & { onItemClick?: () => void; brandName?: string; newOrderCount?: number; onNewOrdersSeen?: () => void }) {
  return (
    <div className="flex flex-col h-full py-3">
      <div className="px-3 mb-3">
        <h2 className="text-base font-bold text-foreground">Painel Admin</h2>
        <p className="text-[10px] text-muted-foreground">{brandName || "Dieta Já"}</p>
      </div>

      <nav className="flex-1 px-1.5 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-2 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onSectionChange(item.id);
                        onItemClick?.();
                        if (item.id === 'orders') onNewOrdersSeen?.();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                        {item.pulse && (
                          <span className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <span className="truncate">{item.label}</span>
                      {item.id === 'orders' && newOrderCount && newOrderCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                          {newOrderCount > 99 ? "99+" : newOrderCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          v2.0 • Sistema de Gestão
        </p>
      </div>
    </div>
  );
}

export function AdminSidebar({
  activeSection,
  onSectionChange,
}: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const { tenant } = useTenant();
  const brandName = tenant?.brand_name || "Meu Restaurante";

  const markOrdersSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem("admin_orders_last_viewed", now);
    setNewOrderCount(0);
  }, []);

  useEffect(() => {
    const fetchNewOrders = async () => {
      const lastViewed = localStorage.getItem("admin_orders_last_viewed") || new Date(0).toISOString();
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastViewed);
      setNewOrderCount(count || 0);
    };
    fetchNewOrders();
    const interval = setInterval(fetchNewOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-52 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-30">
        <SidebarContent
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          brandName={brandName}
          newOrderCount={newOrderCount}
          onNewOrdersSeen={markOrdersSeen}
        />
      </aside>

      {/* Mobile Header with Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Painel Admin</h2>
          <p className="text-xs text-muted-foreground">{brandName}</p>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent
              activeSection={activeSection}
              onSectionChange={onSectionChange}
              onItemClick={() => setMobileOpen(false)}
              brandName={brandName}
              newOrderCount={newOrderCount}
              onNewOrdersSeen={markOrdersSeen}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
