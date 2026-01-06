import { Search, Clock, MapPin, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CardapioHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CardapioHeader = ({ searchQuery, onSearchChange }: CardapioHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary" />
              </div>
            </div>
            <span className="text-xl font-bold text-foreground">
              Dieta<span className="text-primary">Já</span>
            </span>
          </div>

          {/* Info - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Retirada grátis ou Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Seg-Sex: 8h às 18h</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default CardapioHeader;
