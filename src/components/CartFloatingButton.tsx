import { ShoppingCart } from "lucide-react";

interface CartFloatingButtonProps {
  onClick: () => void;
}

const CartFloatingButton = ({ onClick }: CartFloatingButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95"
      aria-label="Abrir carrinho"
    >
      <ShoppingCart className="w-6 h-6" />
    </button>
  );
};

export default CartFloatingButton;
