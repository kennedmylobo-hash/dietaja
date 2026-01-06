import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

const categories: Category[] = [
  { id: "kits", name: "Kits Detox" },
  { id: "carnes", name: "Marmitas: Carnes" },
  { id: "frangos", name: "Marmitas: Frangos" },
  { id: "massas", name: "Marmitas: Massas" },
  { id: "especiais", name: "Marmitas: Especiais" },
];

interface CardapioSidebarProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
  className?: string;
}

const CardapioSidebar = ({ activeCategory, onCategoryClick, className }: CardapioSidebarProps) => {
  return (
    <aside className={cn("bg-card rounded-xl shadow-sm border", className)}>
      <div className="p-4 border-b">
        <h2 className="font-semibold text-base text-foreground">Menu</h2>
      </div>
      <nav className="p-2">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all",
                "border-l-4",
                isActive
                  ? "bg-primary/10 text-primary border-l-primary"
                  : "border-l-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {category.name}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default CardapioSidebar;
