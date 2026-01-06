import { cn } from "@/lib/utils";
import { useMenuCategories } from "@/hooks/useMenuCategories";
import { Skeleton } from "@/components/ui/skeleton";

interface CardapioSidebarProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
  className?: string;
}

const CardapioSidebar = ({ activeCategory, onCategoryClick, className }: CardapioSidebarProps) => {
  const { data: categories, isLoading } = useMenuCategories();

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
        {isLoading ? (
          <div className="space-y-2 px-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          categories?.map((category) => {
            const isActive = activeCategory === category.slug;
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.slug)}
                className={cn(
                  "w-full text-left px-6 py-3.5 text-sm font-medium transition-all",
                  "border-l-4 flex items-center gap-2",
                  isActive
                    ? "border-l-primary text-gray-900 bg-gray-50"
                    : "border-l-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {category.icon && <span>{category.icon}</span>}
                {category.name}
              </button>
            );
          })
        )}
      </nav>
    </aside>
  );
};

export default CardapioSidebar;
