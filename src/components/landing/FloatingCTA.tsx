import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowUp } from "lucide-react";
import { useCart } from "@/components/CartContext";

interface FloatingCTAProps {
  onScrollToPackages: () => void;
  showScrollUp?: boolean;
}

const FloatingCTA = ({ onScrollToPackages, showScrollUp = false }: FloatingCTAProps) => {
  const { itemCount, getTotal } = useCart();
  const total = getTotal();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-md border-t shadow-lg md:hidden"
      >
        <div className="container mx-auto flex items-center gap-3">
          {showScrollUp && (
            <Button
              variant="outline"
              size="icon"
              onClick={scrollToTop}
              className="shrink-0"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          )}

          {itemCount > 0 ? (
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {itemCount} {itemCount === 1 ? 'item' : 'itens'} no carrinho
                </p>
                <p className="text-lg font-bold text-primary">
                  R$ {total.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <Button 
                variant="cta" 
                className="gap-2"
                onClick={onScrollToPackages}
              >
                <ShoppingCart className="w-4 h-4" />
                Ver carrinho
              </Button>
            </div>
          ) : (
            <Button 
              variant="cta" 
              className="flex-1 gap-2"
              onClick={onScrollToPackages}
            >
              <ShoppingCart className="w-4 h-4" />
              Montar meu pedido
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingCTA;
