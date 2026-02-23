import { useState, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";

interface MobileStickyBarProps {
  onCtaClick: () => void;
}

const MobileStickyBar = forwardRef<HTMLDivElement, MobileStickyBarProps>(({ onCtaClick }, ref) => {
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

  // Se não tem itens, não mostra a barra
  if (!hasItems) return null;

  return (
    <div ref={ref} className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </span>
          <span className="text-lg font-bold text-foreground">
            R$ {total.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <Button
          variant="cta"
          size="lg"
          onClick={onCtaClick}
          className="flex-1 max-w-[200px]"
        >
          Finalizar pedido
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
});

MobileStickyBar.displayName = "MobileStickyBar";

export default MobileStickyBar;
