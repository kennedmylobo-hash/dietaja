import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPhoneSuffix } from "@/lib/phone";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Clock,
  MessageCircle,
  RefreshCw,
  User,
  Phone,
  DollarSign,
  Gift,
  Trash2,
  Calendar,
  Repeat,
  Wifi,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface CartItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
}

interface AbandonedCart {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  items: CartItem[];
  subtotal: number;
  status: string;
  created_at: string;
  last_activity_at: string;
  whatsapp_sent_at: string | null;
  whatsapp_2_sent_at: string | null;
}

const AbandonedCartsRecovery = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [dismissingCartId, setDismissingCartId] = useState<string | null>(null);
  const [accessCounts, setAccessCounts] = useState<Record<string, number>>({});
  const { brand } = useTenantConfig();

  const dismissCart = async (cartId: string) => {
    const { error } = await supabase
      .from('carts')
      .update({ status: 'dismissed' })
      .eq('id', cartId);

    if (error) {
      toast({ title: "Erro ao dispensar carrinho", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Carrinho dispensado" });
      if (selectedCart?.id === cartId) setSelectedCart(null);
      setCarts(prev => prev.filter(c => c.id !== cartId));
    }
    setDismissingCartId(null);
  };

  const fetchAbandonedCarts = async () => {
    setIsLoading(true);
    
    // Fetch carts with status 'active' or 'abandoned' that have items
    const { data: cartsData, error: cartsError } = await supabase
      .from('carts')
      .select('*')
      .in('status', ['active', 'abandoned'])
      .not('items', 'eq', '[]')
      .order('last_activity_at', { ascending: false });

    if (cartsError) {
      console.error('Error fetching abandoned carts:', cartsError);
      toast({
        title: "Erro ao carregar carrinhos",
        description: cartsError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Fetch phones of customers with approved/completed orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('customer_phone')
      .in('status', ['approved', 'preparing', 'ready', 'delivering', 'delivered']);

    // Create a set of normalized phone suffixes from completed orders
    const convertedPhones = new Set(
      ordersData?.map(o => getPhoneSuffix(o.customer_phone, 10)) || []
    );

    // Filter out carts whose phone matches a completed order
    const filteredCarts = (cartsData || []).filter(cart => {
      const cartPhoneSuffix = getPhoneSuffix(cart.phone, 10);
      return !convertedPhones.has(cartPhoneSuffix);
    });

    // Count total accesses per phone (all statuses)
    const { data: allCartsData } = await supabase
      .from('carts')
      .select('phone')
      .not('items', 'eq', '[]');

    const counts: Record<string, number> = {};
    (allCartsData || []).forEach(c => {
      const suffix = getPhoneSuffix(c.phone, 10);
      counts[suffix] = (counts[suffix] || 0) + 1;
    });
    setAccessCounts(counts);

    setCarts(filteredCarts as unknown as AbandonedCart[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAbandonedCarts();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('abandoned-carts-recovery')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carts'
        },
        () => {
          fetchAbandonedCarts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const totalValue = carts.reduce((sum, c) => sum + (c.subtotal || 0), 0);
    const activeCarts = carts.filter(c => c.status === 'active');
    const abandonedCarts = carts.filter(c => c.status === 'abandoned');
    const withReminder = carts.filter(c => c.whatsapp_sent_at !== null);
    
    return {
      total: carts.length,
      active: activeCarts.length,
      abandoned: abandonedCarts.length,
      withReminder: withReminder.length,
      totalValue,
    };
  }, [carts]);

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isOnline = (cart: AbandonedCart) => {
    const diff = Date.now() - new Date(cart.last_activity_at).getTime();
    return diff < 3 * 60 * 1000; // active within last 3 minutes
  };

  const getAccessCount = (phone: string) => {
    const suffix = getPhoneSuffix(phone, 10);
    return accessCounts[suffix] || 1;
  };

  const getStatusBadge = (cart: AbandonedCart) => {
    if (isOnline(cart)) {
      return <Badge className="bg-green-500/10 text-green-600">🟢 Online</Badge>;
    }
    if (cart.status === 'abandoned') {
      return <Badge className="bg-orange-500/10 text-orange-600">🛒 Abandonado</Badge>;
    }
    const diff = Date.now() - new Date(cart.last_activity_at).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours > 1) {
      return <Badge className="bg-yellow-500/10 text-yellow-600">⏳ Inativo</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600">🟢 Ativo</Badge>;
  };

  const openWhatsAppRecovery = (cart: AbandonedCart) => {
    const itemsList = cart.items
      .map(item => `• ${item.quantity}x ${item.name}`)
      .join('\n');
    
    const message = encodeURIComponent(
      `Olá ${cart.name || 'cliente'}! 😊\n\n` +
      `Vi que você deixou alguns itens no carrinho da ${brand.name}:\n\n${itemsList}\n\n` +
      `Valor: *R$ ${(cart.subtotal || 0).toFixed(2).replace('.', ',')}*\n\n` +
      `Posso te ajudar a finalizar? 💚`
    );
    
    const phoneDigits = cart.phone.replace(/\D/g, '');
    const formattedPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
    
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const openWhatsAppOffer = (cart: AbandonedCart, discountPercent: number = 10) => {
    const couponCode = `VOLTA${discountPercent}`;
    const today = new Date().toLocaleDateString('pt-BR');
    
    const message = encodeURIComponent(
      `Olá ${cart.name || 'cliente'}! 🎁\n\n` +
      `Tenho uma oferta especial pra você!\n\n` +
      `Use o cupom *${couponCode}* e ganhe *${discountPercent}% OFF* no seu pedido!\n\n` +
      `⏰ Válido apenas para hoje (${today})\n\n` +
      `Posso te ajudar a finalizar? 💚`
    );
    
    const phoneDigits = cart.phone.replace(/\D/g, '');
    const formattedPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
    
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total carrinhos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.abandoned}</p>
                <p className="text-xs text-muted-foreground">Abandonados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withReminder}</p>
                <p className="text-xs text-muted-foreground">Lembretes enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {stats.totalValue.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Valor potencial</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Carts List */}
      {carts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum carrinho abandonado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {carts.map((cart) => (
            <Card 
              key={cart.id}
              className="hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => setSelectedCart(cart)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                        {isOnline(cart) && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{cart.name || 'Cliente'}</p>
                          {getStatusBadge(cart)}
                          {getAccessCount(cart.phone) > 1 && (
                            <Badge variant="outline" className="text-xs">
                              <Repeat className="w-3 h-3 mr-1" />
                              {getAccessCount(cart.phone)}x acessos
                            </Badge>
                          )}
                          {cart.whatsapp_sent_at && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              {getTimeSince(cart.whatsapp_sent_at)} atrás
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {cart.phone}
                          <span className="mx-1">•</span>
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(cart.created_at)}
                          <span className="mx-1">•</span>
                          <Clock className="w-3 h-3" />
                          {getTimeSince(cart.last_activity_at)}
                        </p>
                      </div>
                    </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        R$ {(cart.subtotal || 0).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cart.items?.length || 0} {(cart.items?.length || 0) === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600/30 hover:bg-green-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsAppRecovery(cart);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 border-amber-600/30 hover:bg-amber-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsAppOffer(cart, 10);
                      }}
                    >
                      <Gift className="w-4 h-4 mr-1" />
                      Oferta 10%
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-600/30 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissingCartId(cart.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cart Details Dialog */}
      <Dialog open={!!selectedCart} onOpenChange={() => setSelectedCart(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho de {selectedCart?.name || 'Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCart && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{selectedCart.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCart.email || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">{formatDateTime(selectedCart.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última atividade</p>
                  <p className="font-medium">{formatDateTime(selectedCart.last_activity_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(selectedCart)}
                    {isOnline(selectedCart) && (
                      <Badge className="bg-green-500/10 text-green-600 text-xs">
                        <Wifi className="w-3 h-3 mr-1" />
                        Agora
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Acessos</p>
                  <p className="font-medium">{getAccessCount(selectedCart.phone)}x</p>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <p className="font-medium text-sm">Itens no carrinho:</p>
                {selectedCart.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>R$ {(item.totalPrice || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>R$ {(selectedCart.subtotal || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {selectedCart.whatsapp_sent_at && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <p className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-green-500" />
                    1º lembrete: {new Date(selectedCart.whatsapp_sent_at).toLocaleString('pt-BR')}
                  </p>
                  {selectedCart.whatsapp_2_sent_at && (
                    <p className="flex items-center gap-1 mt-1">
                      <MessageCircle className="w-3 h-3 text-green-500" />
                      2º lembrete: {new Date(selectedCart.whatsapp_2_sent_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => openWhatsAppRecovery(selectedCart)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                  onClick={() => openWhatsAppOffer(selectedCart, 10)}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Oferta 10%
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-600/30 hover:bg-red-500/10"
                  onClick={() => setDismissingCartId(selectedCart.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Dispensar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dismiss Confirmation */}
      <AlertDialog open={!!dismissingCartId} onOpenChange={() => setDismissingCartId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispensar carrinho?</AlertDialogTitle>
            <AlertDialogDescription>
              O carrinho será removido da listagem, mas os dados continuam salvos no banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => dismissingCartId && dismissCart(dismissingCartId)}
            >
              Dispensar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AbandonedCartsRecovery;
