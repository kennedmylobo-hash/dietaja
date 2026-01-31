/**
 * Live Carts Component
 * Exibe carrinhos ativos em tempo real no Admin
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, 
  Phone, 
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Json } from '@/integrations/supabase/types';

interface FlavorSelection {
  name: string;
  quantity: number;
  category?: string;
}

interface CartItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: string;
  flavors?: FlavorSelection[];
}

interface Cart {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  items: Json;
  subtotal: number | null;
  status: string | null;
  last_activity_at: string | null;
  created_at: string | null;
  utm_source: string | null;
}

const LiveCarts = () => {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [expandedCarts, setExpandedCarts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active carts
  const fetchActiveCarts = async () => {
    const { data, error } = await supabase
      .from('carts')
      .select('*')
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching carts:', error);
      return;
    }

    setCarts(data || []);
    setIsLoading(false);
  };

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchActiveCarts();

    // Subscribe to realtime changes on carts table
    const channel = supabase
      .channel('live-carts-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carts',
        },
        () => {
          // Refetch on any change
          fetchActiveCarts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Toggle cart expansion
  const toggleCart = (cartId: string) => {
    setExpandedCarts(prev => {
      const next = new Set(prev);
      if (next.has(cartId)) {
        next.delete(cartId);
      } else {
        next.add(cartId);
      }
      return next;
    });
  };

  // Check if activity is recent (< 2 min)
  const isRecentActivity = (lastActivity: string | null): boolean => {
    if (!lastActivity) return false;
    const diff = Date.now() - new Date(lastActivity).getTime();
    return diff < 2 * 60 * 1000; // 2 minutes
  };

  // Format phone for WhatsApp
  const openWhatsApp = (phone: string, name: string | null) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${name || 'cliente'}! Vi que você está montando um pedido no nosso site. Posso te ajudar com alguma coisa?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  // Parse cart items safely
  const parseCartItems = (items: Json): CartItem[] => {
    if (!items) return [];
    if (Array.isArray(items)) {
      return items as unknown as CartItem[];
    }
    return [];
  };

  // Format currency
  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Active carts (with items)
  const activeCarts = carts.filter(cart => {
    const items = parseCartItems(cart.items);
    return items.length > 0;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Carrinhos Ativos
          {activeCarts.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeCarts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeCarts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhum carrinho ativo no momento
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              <AnimatePresence>
                {activeCarts.map((cart) => {
                  const items = parseCartItems(cart.items);
                  const isRecent = isRecentActivity(cart.last_activity_at);
                  const isExpanded = expandedCarts.has(cart.id);

                  return (
                    <motion.div
                      key={cart.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCart(cart.id)}>
                        <div
                          className={`border rounded-lg overflow-hidden transition-all ${
                            isRecent 
                              ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' 
                              : 'border-border bg-card'
                          }`}
                        >
                          {/* Cart Header */}
                          <CollapsibleTrigger asChild>
                            <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {/* Activity indicator */}
                                  <div className="relative">
                                    {isRecent ? (
                                      <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                      </span>
                                    ) : (
                                      <span className="flex h-3 w-3 rounded-full bg-gray-300"></span>
                                    )}
                                  </div>

                                  {/* Customer info */}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">
                                        {cart.name || 'Cliente anônimo'}
                                      </span>
                                      {isRecent && (
                                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                          Adicionando agora
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      <span>{cart.phone}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Value and time */}
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-bold text-primary">
                                      {formatCurrency(cart.subtotal)}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {cart.last_activity_at
                                        ? formatDistanceToNow(new Date(cart.last_activity_at), {
                                            addSuffix: true,
                                            locale: ptBR,
                                          })
                                        : 'agora'}
                                    </p>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          {/* Expandable Content */}
                          <CollapsibleContent>
                            <div className="border-t px-3 py-3 space-y-3">
                              {/* Items list */}
                              <div className="space-y-2">
                                {items.map((item, idx) => (
                                  <div key={idx} className="text-sm">
                                    <div className="flex items-start gap-2">
                                      <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div className="flex-1">
                                        <span className="font-medium">
                                          {item.quantity}x {item.name}
                                        </span>
                                        <span className="text-muted-foreground ml-2">
                                          ({item.type})
                                        </span>
                                        {item.flavors && item.flavors.length > 0 && (
                                          <p className="text-xs text-muted-foreground mt-0.5 pl-1">
                                            Sabores:{' '}
                                            {item.flavors
                                              .map((f) => `${f.name} (${f.quantity})`)
                                              .join(', ')}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-muted-foreground">
                                        {formatCurrency(item.totalPrice)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* UTM source if present */}
                              {cart.utm_source && (
                                <div className="text-xs text-muted-foreground">
                                  Origem: <Badge variant="outline" className="text-xs">{cart.utm_source}</Badge>
                                </div>
                              )}

                              {/* WhatsApp button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(cart.phone, cart.name);
                                }}
                              >
                                <MessageCircle className="h-4 w-4" />
                                Abrir WhatsApp
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveCarts;
