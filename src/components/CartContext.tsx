import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useCartTracking } from "@/hooks/useSectionTracking";

export interface FlavorSelection {
  name: string;
  quantity: number;
  category: string;
}

export interface CartItem {
  id: string;
  type: "kit" | "marmita";
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  flavors?: FlavorSelection[];
  fishAdditional?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateItemFlavors: (id: string, flavors: FlavorSelection[], fishAdditional?: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  itemCount: number;
  trackCartOpen: () => void;
  trackCheckoutStart: () => void;
  trackCheckoutComplete: (total: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { trackCartEvent } = useCartTracking();

  const addItem = useCallback((newItem: Omit<CartItem, "id">) => {
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
    
    // Track cart_add event
    trackCartEvent('cart_add', {
      item_name: newItem.name,
      item_type: newItem.type,
      value: newItem.totalPrice,
    });
    
    // Check if same type already exists, replace it
    setItems((prev) => {
      const filtered = prev.filter((item) => item.type !== newItem.type);
      return [...filtered, { ...newItem, id }];
    });
  }, [trackCartEvent]);

  const removeItem = useCallback((id: string) => {
    trackCartEvent('cart_remove');
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [trackCartEvent]);

  const updateItemFlavors = useCallback((id: string, flavors: FlavorSelection[], fishAdditional?: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, flavors, fishAdditional: fishAdditional ?? item.fishAdditional } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.totalPrice + (item.fishAdditional || 0), 0);
  }, [items]);
  
  const trackCartOpen = useCallback(() => {
    trackCartEvent('cart_open');
  }, [trackCartEvent]);
  
  const trackCheckoutStart = useCallback(() => {
    trackCartEvent('checkout_start', { items_count: items.length, total: getTotal() });
    
    // Meta Pixel InitiateCheckout
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: getTotal(),
        currency: 'BRL',
        num_items: items.length
      });
    }
  }, [trackCartEvent, items, getTotal]);
  
  const trackCheckoutComplete = useCallback((total: number) => {
    trackCartEvent('checkout_complete', { total });
    
    // Meta Pixel Purchase
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: total,
        currency: 'BRL'
      });
    }
  }, [trackCartEvent]);

  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ 
      items, 
      addItem, 
      removeItem, 
      updateItemFlavors, 
      clearCart, 
      getTotal, 
      itemCount,
      trackCartOpen,
      trackCheckoutStart,
      trackCheckoutComplete
    }}>
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
