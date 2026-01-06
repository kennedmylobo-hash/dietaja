import { Search, MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CardapioHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CardapioHeader = ({ searchQuery, onSearchChange }: CardapioHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-[#2d5016] text-white shadow-lg">
      {/* Leaf Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 5c-5 8-15 12-25 10 5 10 15 15 25 12-10 5-12 15-10 25 10-5 15-15 12-25 5 10 15 12 25 10-10-5-15-15-12-25-5 10-15 12-25 10 10-5 12-15 10-25z' fill='%23ffffff' fill-opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />
      
      <div className="container mx-auto px-4 py-3 relative">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🍃</span>
            <span className="text-xl font-bold">
              Dieta<span className="text-green-300">Já</span>
            </span>
          </div>

          {/* Search - Center */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-white text-foreground placeholder:text-muted-foreground border-0 focus-visible:ring-2 focus-visible:ring-green-300"
            />
          </div>

          {/* Info - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-4 text-sm text-green-100 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>Retirada ou Delivery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Seg-Sex: 8h às 18h</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CardapioHeader;
