import { cn } from "@/lib/utils";
import { useMenuCategories } from "@/hooks/useMenuCategories";
import { Skeleton } from "@/components/ui/skeleton";

interface MobileNavProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const MobileNav = ({ activeCategory, onCategoryClick }: MobileNavProps) => {
  const { data: categories, isLoading } = useMenuCategories();

  if (isLoading) {
    return (
      <div className="md:hidden sticky top-[57px] z-30 bg-background border-b">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="md:hidden sticky top-[57px] z-30 bg-background border-b">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.slug)}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all",
              activeCategory === category.slug
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {category.icon && (
              <span className="text-base mb-0.5">{category.icon}</span>
            )}
            <span className="text-[10px] font-medium leading-tight">
              {category.short_name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
