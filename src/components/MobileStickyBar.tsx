import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";

interface MobileStickyBarProps {
  onCtaClick: () => void;
}

const MobileStickyBar = ({ onCtaClick }: MobileStickyBarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const { itemCount, getTotal } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      // Mostra após rolar 500px
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  const total = getTotal();
  const hasItems = itemCount > 0;

  // Simula vagas restantes
  const getVagasRestantes = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 12;
    if (hour < 14) return 8;
    if (hour < 18) return 5;
    return 3;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-lg">
      {/* Barra de urgência */}
      <div className="bg-terracotta/90 text-white text-center py-1.5 text-xs font-medium">
        🔥 Restam {getVagasRestantes()} vagas • Entrega segunda
      </div>
      
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex flex-col">
          {hasItems ? (
            <>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </span>
              <span className="text-lg font-bold text-foreground">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Kits a partir de</span>
              <span className="text-lg font-bold text-primary">R$ 199</span>
            </>
          )}
        </div>
        <Button
          variant="cta"
          size="lg"
          onClick={onCtaClick}
          className="flex-1 max-w-[200px] animate-pulse"
        >
          {hasItems ? "Finalizar pedido" : "Ver produtos"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default MobileStickyBar;
