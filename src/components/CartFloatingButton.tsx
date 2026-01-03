import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "./CartContext";
import { useEffect, useState } from "react";

interface CartFloatingButtonProps {
  onClick: () => void;
}

const CartFloatingButton = ({ onClick }: CartFloatingButtonProps) => {
  const { itemCount, getTotal } = useCart();
  const [shouldPulse, setShouldPulse] = useState(false);

  // Trigger pulse animation when itemCount changes
  useEffect(() => {
    if (itemCount > 0) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 600);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  if (itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: shouldPulse ? [1, 1.15, 1] : 1, 
          opacity: 1,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ 
          scale: { duration: 0.4, ease: "easeOut" }
        }}
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
        <motion.span 
          className="absolute -top-2 -right-2 w-6 h-6 bg-terracotta text-white text-xs font-bold rounded-full flex items-center justify-center"
          animate={shouldPulse ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {itemCount}
        </motion.span>
        {/* Ripple effect ring */}
        {shouldPulse && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </motion.button>
    </AnimatePresence>
  );
};

export default CartFloatingButton;
