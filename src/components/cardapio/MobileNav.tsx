import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  const [open, setOpen] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick(categoryId);
    setOpen(false);
  };

  return (
    <div className="md:hidden sticky top-[57px] z-30 bg-background border-b">
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex-shrink-0 h-8 px-3">
              <Menu className="h-4 w-4 mr-1.5" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>Categorias</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {categories.map((category) => {
                const isActive = activeCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
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
          </SheetContent>
        </Sheet>

        {/* Quick category pills */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
              activeCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {category.shortName}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
