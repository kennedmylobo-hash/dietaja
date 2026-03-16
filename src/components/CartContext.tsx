import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { useCartTracking } from "@/hooks/useSectionTracking";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams } from "@/lib/utm";
import { useTenantId } from "@/hooks/useTenantId";
import { useSearchParams } from "react-router-dom";

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
  lineType?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  cartId: string | null;
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
  // Soft identification
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  showIdentificationModal: boolean;
  setShowIdentificationModal: (show: boolean) => void;
  pendingItem: Omit<CartItem, "id"> | null;
  confirmAddItem: () => void;
  isIdentified: boolean;
  markCartAsConverted: () => Promise<void>;
  autoOpenCart: boolean;
  clearAutoOpenCart: () => void;
}

const STORAGE_KEY = 'tenant_customer';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfoState] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    cartId: null,
  });
  const [showIdentificationModal, setShowIdentificationModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<Omit<CartItem, "id"> | null>(null);
  const [autoOpenCart, setAutoOpenCart] = useState(false);
  const { trackCartEvent } = useCartTracking();
  const tenantId = useTenantId();

  const isIdentified = !!(customerInfo.phone && customerInfo.name);

  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkProcessed = useRef(false);

  // Promo coupon: detect ?cupom= URL param and store for auto-apply
  useEffect(() => {
    const cupomParam = searchParams.get('cupom') || searchParams.get('coupon');
    if (cupomParam) {
      localStorage.setItem('promo_coupon', cupomParam.toUpperCase());
      searchParams.delete('cupom');
      searchParams.delete('coupon');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  // Deep link: restore cart from ?cart=CART_ID parameter
  useEffect(() => {
    if (deepLinkProcessed.current) return;
    const cartIdParam = searchParams.get('cart');
    if (cartIdParam) {
      deepLinkProcessed.current = true;
      restoreCartByDeepLink(cartIdParam);
      // Clean the URL param
      searchParams.delete('cart');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const restoreCartByDeepLink = async (cartId: string) => {
    try {
      const { data: cart, error } = await supabase
        .from('carts')
        .select('*')
        .eq('id', cartId)
        .maybeSingle();

      if (error || !cart || !cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
        console.warn('Deep link cart not found or empty:', cartId);
        return;
      }

      const restoredItems = (cart.items as any[]).map((item, index) => ({
        ...item,
        id: item.id || `${item.type}-${item.name}-${Date.now()}-${index}`,
      }));
      setItems(restoredItems);

      const restoredInfo: CustomerInfo = {
        name: cart.name || '',
        phone: cart.phone,
        email: cart.email || '',
        cartId: cart.id,
      };
      setCustomerInfoState(restoredInfo);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredInfo));

      console.log(`[CartContext] ✅ Cart restored via deep link: ${cartId}`);
      setAutoOpenCart(true);
    } catch (e) {
      console.error('Error restoring cart by deep link:', e);
    }
  };

  // Load customer info from localStorage on mount
  useEffect(() => {
    if (deepLinkProcessed.current) return; // skip if deep link already handled
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomerInfoState(parsed);
        
        // Try to restore cart from database
        if (parsed.phone) {
          restoreCartFromDatabase(parsed.phone);
        }
      } catch (e) {
        console.error('Error loading customer info:', e);
      }
    }
  }, []);

  // Restore cart from database for returning customers
  const restoreCartFromDatabase = async (phone: string) => {
    try {
      const { data: cart, error } = await supabase
        .from('carts')
        .select('*')
        .eq('phone', phone)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching cart:', error);
        return;
      }

      if (cart && cart.items && Array.isArray(cart.items) && cart.items.length > 0) {
        // Restore items with proper IDs
        const restoredItems = (cart.items as any[]).map((item, index) => ({
          ...item,
          id: item.id || `${item.type}-${item.name}-${Date.now()}-${index}`,
        }));
        setItems(restoredItems);
        
        // Update customerInfo with cart data
        setCustomerInfoState(prev => ({
          ...prev,
          cartId: cart.id,
          email: cart.email || prev.email,
        }));
      }
    } catch (e) {
      console.error('Error restoring cart:', e);
    }
  };

  // Save customer info to localStorage and state
  const setCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfoState(info);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  }, []);

  // Sync cart to database
  const syncCartToDatabase = useCallback(async (cartItems: CartItem[], info: CustomerInfo) => {
    if (!info.phone) return;

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice + (item.fishAdditional || 0), 0);
    const utmParams = getUTMParams();

    try {
      // Prepare items as JSON-compatible format
      const itemsJson = JSON.parse(JSON.stringify(cartItems.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        description: item.description || null,
        flavors: item.flavors || [],
        fishAdditional: item.fishAdditional || 0,
      }))));

      // Check if cart exists first
      const { data: existingCart } = await supabase
        .from('carts')
        .select('id')
        .eq('phone', info.phone)
        .eq('status', 'active')
        .maybeSingle();

      let cartId = existingCart?.id;

      if (existingCart) {
        // Update existing cart
        const { error } = await supabase
          .from('carts')
          .update({
            name: info.name || null,
            email: info.email || null,
            items: itemsJson,
            subtotal,
            status: 'active',
            last_activity_at: new Date().toISOString(),
            utm_source: utmParams?.utm_source || null,
            utm_medium: utmParams?.utm_medium || null,
            utm_campaign: utmParams?.utm_campaign || null,
            tenant_id: tenantId,
          })
          .eq('phone', info.phone);

        if (error) {
          console.error('Error updating cart:', error);
          return;
        }
      } else {
        // Insert new cart
        const { data, error } = await supabase
          .from('carts')
          .insert({
            phone: info.phone,
            name: info.name || null,
            email: info.email || null,
            items: itemsJson,
            subtotal,
            status: 'active',
            last_activity_at: new Date().toISOString(),
            utm_source: utmParams?.utm_source || null,
            utm_medium: utmParams?.utm_medium || null,
            utm_campaign: utmParams?.utm_campaign || null,
            tenant_id: tenantId,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error inserting cart:', error);
          return;
        }
        cartId = data?.id;
      }

      if (cartId && !info.cartId) {
        setCustomerInfo({ ...info, cartId });
      }
    } catch (e) {
      console.error('Error syncing cart to database:', e);
    }
  }, [setCustomerInfo]);

  // Sync cart whenever items or customerInfo change
  useEffect(() => {
    if (isIdentified && items.length > 0) {
      syncCartToDatabase(items, customerInfo);
    }
  }, [items, customerInfo, isIdentified, syncCartToDatabase]);

  const addItem = useCallback((newItem: Omit<CartItem, "id">) => {
    // If not identified, show modal and save pending item
    if (!isIdentified) {
      setPendingItem(newItem);
      setShowIdentificationModal(true);
      return;
    }

    // Proceed with adding item
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
    
    // Track AddToCart with GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'BRL',
        value: newItem.totalPrice,
        items: [{
          item_id: id,
          item_name: newItem.name,
          item_category: newItem.type,
          price: newItem.unitPrice,
          quantity: newItem.quantity,
        }]
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
  }, [trackCartEvent, isIdentified]);

  // Confirm adding item after identification
  const confirmAddItem = useCallback(() => {
    if (!pendingItem) return;

    const id = `${pendingItem.type}-${pendingItem.name}-${Date.now()}`;
    
    // Track AddToCart event with Meta Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_name: pendingItem.name,
        content_type: 'product',
        value: pendingItem.totalPrice,
        currency: 'BRL'
      });
    }
    
    // Track AddToCart with GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'BRL',
        value: pendingItem.totalPrice,
        items: [{
          item_id: id,
          item_name: pendingItem.name,
          item_category: pendingItem.type,
          price: pendingItem.unitPrice,
          quantity: pendingItem.quantity,
        }]
      });
    }
    
    // Track cart_add event
    trackCartEvent('cart_add', {
      item_name: pendingItem.name,
      item_type: pendingItem.type,
      value: pendingItem.totalPrice,
    });
    
    // Check if same type already exists, replace it
    setItems((prev) => {
      const filtered = prev.filter((item) => item.type !== pendingItem.type);
      return [...filtered, { ...pendingItem, id }];
    });

    setPendingItem(null);
    setShowIdentificationModal(false);
  }, [pendingItem, trackCartEvent]);

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
    
    // GA4 begin_checkout
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'BRL',
        value: getTotal(),
        items: items.map((item, index) => ({
          item_id: item.id,
          item_name: item.name,
          item_category: item.type,
          price: item.unitPrice,
          quantity: item.quantity,
          index: index,
        }))
      });
    }
  }, [trackCartEvent, items, getTotal]);
  
  const trackCheckoutComplete = useCallback((total: number) => {
    trackCartEvent('checkout_complete', { total });
    // Purchase event is tracked ONLY in PagamentoSucesso.tsx (with CAPI deduplication)
  }, [trackCartEvent]);

  // Mark cart as converted when order is completed
  const markCartAsConverted = useCallback(async () => {
    if (!customerInfo.phone) return;

    try {
      await supabase
        .from('carts')
        .update({ status: 'converted' })
        .eq('phone', customerInfo.phone)
        .eq('status', 'active');
    } catch (e) {
      console.error('Error marking cart as converted:', e);
    }
  }, [customerInfo.phone]);

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
      trackCheckoutComplete,
      // Soft identification
      customerInfo,
      setCustomerInfo,
      showIdentificationModal,
      setShowIdentificationModal,
      pendingItem,
      confirmAddItem,
      isIdentified,
      markCartAsConverted,
      autoOpenCart,
      clearAutoOpenCart: () => setAutoOpenCart(false),
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
