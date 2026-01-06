import { useState } from "react";
import { Menu, X, Leaf, Drumstick, Beef, Fish, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
    <div className="md:hidden sticky top-[65px] z-30 bg-background/95 backdrop-blur-sm border-b px-4 py-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <Menu className="h-4 w-4 mr-2" />
              Menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>Categorias</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{category.name}</span>
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
              "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              activeCategory === category.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
