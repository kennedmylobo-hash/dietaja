import { cn } from "@/lib/utils";
import { Leaf, Drumstick, Beef, Fish, UtensilsCrossed } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
}

const categories: Category[] = [
  { id: "kits", name: "Kits Detox", icon: Leaf },
  { id: "carnes", name: "Carnes", icon: Beef },
  { id: "frangos", name: "Frangos", icon: Drumstick },
  { id: "massas", name: "Massas", icon: UtensilsCrossed },
  { id: "especiais", name: "Especiais", icon: Fish },
];

interface CardapioSidebarProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
  className?: string;
}

const CardapioSidebar = ({ activeCategory, onCategoryClick, className }: CardapioSidebarProps) => {
  return (
    <aside className={cn("bg-card rounded-xl p-4 shadow-sm border", className)}>
      <h2 className="font-semibold text-lg mb-4 text-foreground">Categorias</h2>
      <nav className="space-y-1">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{category.name}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default CardapioSidebar;
