import { cn } from "@/lib/utils";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarCategory {
  id: string;
  name: string;
  icon: string;
}

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  { id: "kits", name: "Kits Detox", icon: "🥤" },
  { id: "fit", name: "Marmitas Fit (300g)", icon: "🥗" },
  { id: "fitness", name: "Marmitas Fitness (450g)", icon: "💪" },
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
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-semibold text-lg text-gray-700">Menu</h2>
      </div>
      
      <nav className="flex-1 py-4">
        {SIDEBAR_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => {
                onCategoryClick(category.id);
                trackMetaEvent({
                  eventName: 'ViewContent',
                  eventId: generateMetaEventId('view_category'),
                  params: { content_type: 'category', content_name: category.name, content_category: category.id },
                });
              }}
              className={cn(
                "w-full text-left px-6 py-3.5 text-sm font-medium transition-all",
                "border-l-4 flex items-center gap-2",
                isActive
                  ? "border-l-primary text-gray-900 bg-gray-50"
                  : "border-l-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default CardapioSidebar;
