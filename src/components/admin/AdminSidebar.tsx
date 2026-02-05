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
  AlertTriangle,
  Menu,
  X,
   Users,
   TrendingUp,
   Star,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
    title: "Operações",
    items: [
      { id: "live", label: "Ao Vivo", icon: Radio, pulse: true },
      { id: "orders", label: "Pedidos", icon: Package },
      { id: "production", label: "Produção", icon: ChefHat },
      { id: "whatsapp-import", label: "Importar", icon: MessageCircle },
    ],
  },
  {
    title: "Analytics",
    items: [
      { id: "kpis", label: "Dashboard", icon: TrendingUp },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "funnel", label: "Funil", icon: Activity },
      { id: "customers", label: "Clientes", icon: Users },
    ],
  },
  {
    title: "Gestão",
    items: [
      { id: "menu", label: "Cardápio", icon: UtensilsCrossed },
      { id: "stock", label: "Estoque", icon: Warehouse },
      { id: "history", label: "Histórico", icon: History },
      { id: "reviews", label: "Avaliações", icon: Star },
    ],
  },
  {
    title: "Marketing",
    items: [
      { id: "marketing", label: "Campanhas", icon: Megaphone },
      { id: "notifications", label: "Notificações", icon: Bell },
      { id: "recovery", label: "Recuperar", icon: RefreshCw },
    ],
  },
  {
    title: "Erros",
    items: [{ id: "payment-errors", label: "Erros PIX", icon: AlertTriangle }],
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
}: AdminSidebarProps & { onItemClick?: () => void }) {
  return (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-6">
        <h2 className="text-lg font-bold text-foreground">Painel Admin</h2>
        <p className="text-xs text-muted-foreground">Dieta Já</p>
      </div>

      <nav className="flex-1 px-2 space-y-6 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onSectionChange(item.id);
                        onItemClick?.();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="relative">
                        <Icon className="h-4 w-4" />
                        {item.pulse && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
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

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-30">
        <SidebarContent
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
      </aside>

      {/* Mobile Header with Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Painel Admin</h2>
          <p className="text-xs text-muted-foreground">Dieta Já</p>
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
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
