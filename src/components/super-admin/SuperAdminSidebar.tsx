import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  CreditCard,
  UserPlus,
  Settings,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tenants", label: "Restaurantes", icon: Store },
  { id: "plans", label: "Planos", icon: CreditCard },
  { id: "billing", label: "Cobranças", icon: Settings },
  { id: "onboarding", label: "Novo Restaurante", icon: UserPlus },
];

interface SuperAdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

function SidebarContent({
  activeSection,
  onSectionChange,
  onItemClick,
}: SuperAdminSidebarProps & { onItemClick?: () => void }) {
  return (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 mb-6">
        <h2 className="text-lg font-bold text-foreground">Super Admin</h2>
        <p className="text-xs text-muted-foreground">Gestão da Plataforma</p>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
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
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Plataforma SaaS v1.0
        </p>
      </div>
    </div>
  );
}

export function SuperAdminSidebar({ activeSection, onSectionChange }: SuperAdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-30">
        <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Super Admin</h2>
          <p className="text-xs text-muted-foreground">Plataforma</p>
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
