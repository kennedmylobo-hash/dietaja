import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPhoneVariations } from "@/lib/phone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Clock,
  MessageCircle,
  Phone,
  RefreshCw,
  CheckCircle,
  Mail,
  Calendar,
  DollarSign,
  User,
  Package,
  Gift,
  Trash2,
  CreditCard,
  Truck,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface FlavorItem {
  name: string;
  quantity: number;
  category?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
  flavors?: FlavorItem[];
}

interface PendingOrder {
  id: string;
  order_number: string | null;
  status: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_option: string;
  delivery_address: string | null;
  created_at: string;
  paid_at: string | null;
  reminder_sent_at: string | null;
  whatsapp_sent_at: string | null;
}

const PendingOrdersRecovery = () => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<PendingOrder | null>(null);

  const fetchPendingOrders = async () => {
    setIsLoading(true);
    
    // Fetch orders with status 'awaiting_payment' (awaiting payment)
    // or 'pending' older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`status.eq.awaiting_payment,and(status.eq.pending,created_at.lt.${thirtyMinutesAgo})`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending orders:', error);
      toast({
        title: "Erro ao carregar pedidos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPendingOrders((data as unknown as PendingOrder[]) || []);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('pending-orders-recovery')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // Refetch to get updated list
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const totalValue = pendingOrders.reduce((sum, o) => sum + o.total, 0);
    const awaitingOrders = pendingOrders.filter(o => o.status === 'awaiting_payment');
    const oldPendingOrders = pendingOrders.filter(o => o.status === 'pending');
    const withEmailReminder = pendingOrders.filter(o => o.reminder_sent_at !== null);
    const withWhatsAppReminder = pendingOrders.filter(o => o.whatsapp_sent_at !== null);
    
    return {
      total: pendingOrders.length,
      awaiting: awaitingOrders.length,
      oldPending: oldPendingOrders.length,
      withEmailReminder: withEmailReminder.length,
      withWhatsAppReminder: withWhatsAppReminder.length,
      totalValue,
    };
  }, [pendingOrders]);

  const getTimeSinceOrder = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
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

  const getUrgencyBadge = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours > 24) {
      return <Badge className="bg-red-500/10 text-red-600">🔴 Crítico</Badge>;
    }
    if (hours > 6) {
      return <Badge className="bg-orange-500/10 text-orange-600">🟠 Alto</Badge>;
    }
    if (hours > 1) {
      return <Badge className="bg-yellow-500/10 text-yellow-600">🟡 Médio</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-600">🔵 Recente</Badge>;
  };

  const openWhatsAppRecovery = (order: PendingOrder) => {
    const orderNumber = order.order_number || order.id.slice(0, 8);
    const message = encodeURIComponent(
      `Olá ${order.customer_name}! 😊\n\n` +
      `Notamos que seu pedido *#${orderNumber}* está aguardando pagamento.\n\n` +
      `Valor: *R$ ${order.total.toFixed(2).replace('.', ',')}*\n\n` +
      `Gostaria de finalizar a compra? Posso te ajudar com o pagamento via PIX! 💚`
    );
    window.open(`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const openWhatsAppOffer = (order: PendingOrder, discountPercent: number = 10) => {
    const orderNumber = order.order_number || order.id.slice(0, 8);
    const couponCode = `VOLTA${discountPercent}`;
    const today = new Date().toLocaleDateString('pt-BR');
    
    const message = encodeURIComponent(
      `Olá ${order.customer_name}! 🎁\n\n` +
      `Tenho uma oferta especial pro seu pedido *#${orderNumber}*!\n\n` +
      `Use o cupom *${couponCode}* e ganhe *${discountPercent}% OFF*!\n\n` +
      `⏰ Válido apenas para hoje (${today})\n\n` +
      `Posso te ajudar a finalizar? 💚`
    );
    window.open(`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const confirmOrderManually = async (orderId: string, paymentNote?: string) => {
    setIsConfirming(orderId);
    
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'approved',
          paid_at: new Date().toISOString(),
          payment_method: paymentNote === 'delivery' ? 'na_entrega' : 'manual'
        })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      // Record status change in history
      const orderData = pendingOrders.find(o => o.id === orderId);
      const notes = paymentNote === 'delivery' 
        ? 'Pagamento será realizado na entrega' 
        : 'Pagamento confirmado manualmente';
        
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('order_status_history').insert({
          order_id: orderId,
          previous_status: orderData?.status || 'pending',
          new_status: 'approved',
          changed_by: user?.id || null,
          changed_by_name: user?.email?.split('@')[0] || 'Admin',
          notes
        });
      } catch (historyError) {
        console.error('Error recording status history:', historyError);
      }

      // Call decrement-stock edge function
      const { error: decrementError } = await supabase.functions.invoke('decrement-stock', {
        body: { order_id: orderId }
      });

      if (decrementError) {
        console.error('Error decrementing stock:', decrementError);
      }

      // Send order confirmation email
      try {
        await supabase.functions.invoke('send-order-approved', {
          body: {
            order_number: orderData?.order_number || orderId.slice(0, 8),
            customer_email: orderData?.customer_email,
            customer_name: orderData?.customer_name,
            customer_phone: orderData?.customer_phone,
            items: orderData?.items,
            subtotal: orderData?.subtotal,
            delivery_fee: orderData?.delivery_fee || 0,
            total: orderData?.total,
            delivery_option: orderData?.delivery_option,
            delivery_address: orderData?.delivery_address,
            payment_method: paymentNote === 'delivery' ? 'na_entrega' : 'manual'
          }
        });
       console.log('✅ Email + WhatsApp confirmation sent via send-order-approved');
      } catch (emailError) {
        console.error('Email confirmation error:', emailError);
      }

      // Mark associated cart as converted
      if (orderData?.customer_phone) {
        await markCartAsConverted(orderData.customer_phone);
      }

      toast({
        title: paymentNote === 'delivery' ? "Pagamento na entrega!" : "Pedido confirmado!",
        description: paymentNote === 'delivery' 
          ? "O pedido foi confirmado e o pagamento será na entrega." 
          : "O pedido foi marcado como pago e o estoque foi atualizado.",
      });

      // Remove from list
      setPendingOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrder(null);

    } catch (error: any) {
      console.error('Error confirming order:', error);
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsConfirming(null);
    }
  };

  // Mark cart as converted when order is confirmed
  const markCartAsConverted = async (customerPhone: string) => {
    try {
      const phoneVariations = getPhoneVariations(customerPhone);
      
      // Build OR filter for phone variations
      const orFilter = phoneVariations.map(p => `phone.eq.${p}`).join(',');
      
      const { error } = await supabase
        .from('carts')
        .update({ status: 'converted' })
        .or(orFilter);

      if (error) {
        console.error('Error marking cart as converted:', error);
      } else {
        console.log('✅ Cart marked as converted for phone:', customerPhone);
      }
    } catch (error) {
      console.error('Error in markCartAsConverted:', error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setIsDeleting(orderId);
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Pedido excluído",
        description: "O pedido foi removido com sucesso.",
      });

      // Remove from list
      setPendingOrders(prev => prev.filter(o => o.id !== orderId));
      setOrderToDelete(null);
      setSelectedOrder(null);

    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
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
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">A recuperar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.awaiting}</p>
                <p className="text-xs text-muted-foreground">Aguardando pag.</p>
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
                <p className="text-2xl font-bold">{stats.oldPending}</p>
                <p className="text-xs text-muted-foreground">Pendentes antigos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withEmailReminder}</p>
                <p className="text-xs text-muted-foreground">Emails enviados</p>
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
                <p className="text-2xl font-bold">{stats.withWhatsAppReminder}</p>
                <p className="text-xs text-muted-foreground">WhatsApps enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
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

      {/* Instructions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Como recuperar pedidos</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes que confirmaram o pedido mas não completaram o pagamento aparecem aqui.
                Use o botão do WhatsApp para enviar uma mensagem de recuperação e feche a venda!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Pedidos Aguardando Pagamento
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchPendingOrders}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum pedido pendente!</p>
              <p className="text-sm text-muted-foreground">
                Todos os clientes finalizaram seus pagamentos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold">{order.customer_name}</p>
                        {getUrgencyBadge(order.created_at)}
                        {order.reminder_sent_at && (
                          <Badge className="bg-purple-500/10 text-purple-600 text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            Email
                          </Badge>
                        )}
                        {order.whatsapp_sent_at && (
                          <Badge className="bg-green-500/10 text-green-600 text-xs">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {getTimeSinceOrder(order.whatsapp_sent_at)} atrás
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          #{order.order_number || order.id.slice(0, 8)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSinceOrder(order.created_at)} atrás
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {order.customer_phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => openWhatsAppRecovery(order)}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={() => openWhatsAppOffer(order, 10)}
                      >
                        <Gift className="w-4 h-4 mr-1" />
                        Oferta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Detalhes
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setOrderToDelete(order)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pedido #{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p><strong>Nome:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Telefone:</strong> {selectedOrder.customer_phone}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                  <p><strong>Entrega:</strong> {selectedOrder.delivery_option === 'pickup' ? 'Retirada' : 'Entrega'}</p>
                  {selectedOrder.delivery_address && (
                    <p><strong>Endereço:</strong> {selectedOrder.delivery_address}</p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Itens do Pedido
                </h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>R$ {item.totalPrice.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {item.flavors && item.flavors.length > 0 && (
                        <div className="mt-1 pl-4 text-xs text-muted-foreground">
                          Sabores: {item.flavors.map(f => `${f.quantity}x ${f.name}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {selectedOrder.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete:</span>
                  <span>R$ {selectedOrder.delivery_fee.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between font-bold text-primary">
                  <span>Total:</span>
                  <span>R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Time Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Pedido feito em {new Date(selectedOrder.created_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(selectedOrder.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Reminder Status */}
              <div className="space-y-2">
                {selectedOrder.reminder_sent_at && (
                  <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-500/10 rounded-lg p-3">
                    <Mail className="w-4 h-4" />
                    <span>
                      Email enviado em {new Date(selectedOrder.reminder_sent_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(selectedOrder.reminder_sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {selectedOrder.whatsapp_sent_at && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 rounded-lg p-3">
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      WhatsApp enviado em {new Date(selectedOrder.whatsapp_sent_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(selectedOrder.whatsapp_sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => openWhatsAppRecovery(selectedOrder)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                  onClick={() => openWhatsAppOffer(selectedOrder, 10)}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Oferta 10%
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => confirmOrderManually(selectedOrder.id, 'manual')}
                  disabled={isConfirming === selectedOrder.id}
                >
                  {isConfirming === selectedOrder.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Pago Manualmente
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-500/10"
                  onClick={() => confirmOrderManually(selectedOrder.id, 'delivery')}
                  disabled={isConfirming === selectedOrder.id}
                >
                  {isConfirming === selectedOrder.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4 mr-2" />
                  )}
                  Pagar na Entrega
                </Button>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setOrderToDelete(selectedOrder)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Pedido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pedido #{orderToDelete?.order_number || orderToDelete?.id.slice(0, 8)}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => orderToDelete && deleteOrder(orderToDelete.id)}
              disabled={isDeleting === orderToDelete?.id}
            >
              {isDeleting === orderToDelete?.id ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PendingOrdersRecovery;
