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
    <aside className={cn(
      "bg-white border-r border-gray-200 flex flex-col",
      className
    )}>
      {/* Header do Menu */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-semibold text-lg text-gray-700">Menu</h2>
      </div>
      
      {/* Navegação */}
      <nav className="flex-1 py-4">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className={cn(
                "w-full text-left px-6 py-3.5 text-sm font-medium transition-all",
                "border-l-4",
                isActive
                  ? "border-l-primary text-gray-900 bg-gray-50"
                  : "border-l-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
