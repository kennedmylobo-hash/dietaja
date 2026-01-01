import { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  id: string;
  type: "kit" | "marmita";
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (newItem: Omit<CartItem, "id">) => {
    const id = `${newItem.type}-${newItem.name}-${Date.now()}`;
    
    // Track AddToCart event with Meta Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_name: newItem.name,
        content_type: 'product',
        value: newItem.totalPrice,
        currency: 'BRL'
      });
    }
    
    // Check if same type already exists, replace it
    setItems((prev) => {
      const filtered = prev.filter((item) => item.type !== newItem.type);
      return [...filtered, { ...newItem, id }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, getTotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
