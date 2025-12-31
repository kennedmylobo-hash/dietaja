import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "./CartContext";

interface CartFloatingButtonProps {
  onClick: () => void;
}

const CartFloatingButton = ({ onClick }: CartFloatingButtonProps) => {
  const { itemCount, getTotal } = useCart();

  if (itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Abrir carrinho"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="font-semibold">
          R$ {getTotal().toFixed(2).replace(".", ",")}
        </span>
        <span className="absolute -top-2 -right-2 w-6 h-6 bg-terracotta text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {itemCount}
        </span>
      </motion.button>
    </AnimatePresence>
  );
};

export default CartFloatingButton;
