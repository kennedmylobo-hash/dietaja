import { cn } from "@/lib/utils";

interface NavCategory {
  id: string;
  shortName: string;
  icon: string;
}

const NAV_CATEGORIES: NavCategory[] = [
  { id: "kits", shortName: "Detox", icon: "🥤" },
  { id: "fit", shortName: "Emagrecimento", icon: "🥗" },
  { id: "fitness", shortName: "Hipertrofia", icon: "💪" },
];

interface MobileNavProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const MobileNav = ({ activeCategory, onCategoryClick }: MobileNavProps) => {
  return (
    <div className="md:hidden sticky top-[57px] z-30 bg-background border-b">
      <div className="grid grid-cols-3 gap-1 px-2 py-2">
        {NAV_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all",
              activeCategory === category.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="text-base mb-0.5">{category.icon}</span>
            <span className="text-[10px] font-medium leading-tight">
              {category.shortName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
