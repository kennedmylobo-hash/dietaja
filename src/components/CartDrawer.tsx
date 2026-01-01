import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2, MessageCircle, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "./CartContext";
import { hapticFeedback } from "@/lib/haptics";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}

const CartDrawer = ({ open, onOpenChange, onCheckout }: CartDrawerProps) => {
  const { items, removeItem, getTotal, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const total = getTotal();

  const handleCheckout = async () => {
    setIsLoading(true);
    
    // Haptic feedback on checkout
    hapticFeedback('medium');
    
    // Brief loading for feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onCheckout();
    onOpenChange(false);
    setIsLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Seu Carrinho
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione kits detox ou marmitas para começar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border"
                >
                  <div className="flex-1">
                    <span className="text-xs uppercase tracking-wide text-primary font-medium">
                      {item.type === "kit" ? "Kit Detox" : "Marmitas"}
                    </span>
                    <h4 className="font-semibold text-foreground mt-1">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {item.type === "marmita" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.quantity}x R$ {item.unitPrice.toFixed(2).replace(".", ",")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">
                      R$ {item.totalPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-4 border-t border-border pt-4">
            <div className="flex justify-between items-center w-full">
              <span className="text-lg font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>
            
            <Button
              variant="cta"
              size="lg"
              className="w-full"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Preparando pedido...
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  Finalizar pedido via WhatsApp
                </>
              )}
            </Button>
            
            <button
              onClick={clearCart}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar carrinho
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
