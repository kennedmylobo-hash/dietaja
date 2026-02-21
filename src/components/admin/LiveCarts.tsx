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
  User,
  Trash2,
  Calendar,
  Repeat,
  Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Json } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [accessCounts, setAccessCounts] = useState<Record<string, number>>({});
  const [dismissingCartId, setDismissingCartId] = useState<string | null>(null);

  // Fetch access counts per phone
  const fetchAccessCounts = async () => {
    const { data, error } = await supabase
      .from('carts')
      .select('phone');

    if (error || !data) return;

    const counts: Record<string, number> = {};
    data.forEach((c) => {
      counts[c.phone] = (counts[c.phone] || 0) + 1;
    });
    setAccessCounts(counts);
  };

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
    fetchAccessCounts();

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
          fetchActiveCarts();
          fetchAccessCounts();
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

  // Check if activity is recent (< 3 min)
  const isRecentActivity = (lastActivity: string | null): boolean => {
    if (!lastActivity) return false;
    const diff = Date.now() - new Date(lastActivity).getTime();
    return diff < 3 * 60 * 1000;
  };

  // Dismiss cart (soft delete)
  const dismissCart = async (cartId: string) => {
    const { error } = await supabase
      .from('carts')
      .update({ status: 'dismissed' })
      .eq('id', cartId);

    if (!error) {
      setCarts(prev => prev.filter(c => c.id !== cartId));
      setDismissingCartId(null);
    }
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

  // Format date/time
  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '';
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
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
    <>
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
                    const phoneAccessCount = accessCounts[cart.phone] || 0;

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
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                          {cart.name || 'Cliente anônimo'}
                                        </span>
                                        {isRecent && (
                                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                            <Wifi className="h-3 w-3 mr-1" />
                                            Online
                                          </Badge>
                                        )}
                                        {phoneAccessCount > 1 && (
                                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                            <Repeat className="h-3 w-3 mr-1" />
                                            {phoneAccessCount}x acessos
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {cart.phone}
                                        </span>
                                        {cart.created_at && (
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDateTime(cart.created_at)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Value, time and dismiss */}
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="font-bold text-primary">
                                        {formatCurrency(cart.subtotal)}
                                      </p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                        <Clock className="h-3 w-3" />
                                        {cart.last_activity_at
                                          ? formatDistanceToNow(new Date(cart.last_activity_at), {
                                              addSuffix: true,
                                              locale: ptBR,
                                            })
                                          : 'agora'}
                                      </p>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDismissingCartId(cart.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
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

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openWhatsApp(cart.phone, cart.name);
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    Abrir WhatsApp
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDismissingCartId(cart.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Dispensar
                                  </Button>
                                </div>
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

      {/* Dismiss confirmation dialog */}
      <AlertDialog open={!!dismissingCartId} onOpenChange={(open) => !open && setDismissingCartId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispensar carrinho?</AlertDialogTitle>
            <AlertDialogDescription>
              O carrinho será removido da listagem mas os dados serão mantidos no banco. Esta ação pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dismissingCartId && dismissCart(dismissingCartId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Dispensar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LiveCarts;
