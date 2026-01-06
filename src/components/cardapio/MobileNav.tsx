import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  shortName: string;
}

const categories: Category[] = [
  { id: "kits", name: "Kits Detox", shortName: "Kits" },
  { id: "carnes", name: "Marmitas: Carnes", shortName: "Carnes" },
  { id: "frangos", name: "Marmitas: Frangos", shortName: "Frangos" },
  { id: "massas", name: "Marmitas: Massas", shortName: "Massas" },
  { id: "especiais", name: "Marmitas: Especiais", shortName: "Especiais" },
];

interface MobileNavProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const MobileNav = ({ activeCategory, onCategoryClick }: MobileNavProps) => {

  return (
    <div className="md:hidden sticky top-[57px] z-30 bg-background border-b">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {categories.map((category) => (
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
            <span className="text-xs font-medium leading-tight">
              {category.shortName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
