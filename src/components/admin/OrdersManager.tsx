import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Eye,
  MessageCircle,
  TrendingUp,
  Calendar,
  ChefHat,
  Truck,
  Ban,
  AlertTriangle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface Order {
  id: string;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  status: string;
  payment_method: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_option: string;
  delivery_address: string | null;
  utm_data: Record<string, string> | null;
  created_at: string;
  paid_at: string | null;
  stock_decremented?: boolean;
}

interface OrdersManagerProps {
  dateFilter: 'today' | 'week' | 'month';
}

const OrdersManager = ({ dateFilter }: OrdersManagerProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    
    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        break;
    }
    
    return start.toISOString();
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    const startDate = getDateRange();
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders((data as unknown as Order[]) || []);
    }
    
    setIsLoading(false);
  };

  // Fetch orders on mount and when dateFilter changes
  useEffect(() => {
    fetchOrders();
  }, [dateFilter]);

  // Real-time subscription for order updates
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime order update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders(prev => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrders(prev => 
              prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as { id: string };
            setOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const stats = useMemo(() => {
    const approved = orders.filter(o => o.status === 'approved');
    const preparing = orders.filter(o => o.status === 'preparing');
    const ready = orders.filter(o => o.status === 'ready');
    const delivering = orders.filter(o => o.status === 'delivering');
    const delivered = orders.filter(o => o.status === 'delivered');
    const pending = orders.filter(o => o.status === 'pending');
    const whatsappPending = orders.filter(o => o.status === 'whatsapp_pending');
    const rejected = orders.filter(o => o.status === 'rejected');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const totalRevenue = [...approved, ...preparing, ...ready, ...delivering, ...delivered].reduce((sum, o) => sum + o.total, 0);
    
    return { 
      approved: approved.length, 
      preparing: preparing.length,
      ready: ready.length,
      delivering: delivering.length,
      delivered: delivered.length,
      pending: pending.length + whatsappPending.length, 
      whatsappPending: whatsappPending.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      totalRevenue 
    };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">✅ Pago</Badge>;
      case 'preparing':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">👨‍🍳 Produção</Badge>;
      case 'ready':
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">📦 Separado</Badge>;
      case 'delivering':
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">🛵 Em Entrega</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">⏳ Aguardando</Badge>;
      case 'whatsapp_pending':
        return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20">📲 WhatsApp</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">❌ Rejeitado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">🚫 Cancelado</Badge>;
      case 'delivered':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">🎉 Entregue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const ALL_STATUSES = [
    { value: 'pending', label: '⏳ Aguardando Pagamento' },
    { value: 'whatsapp_pending', label: '📲 WhatsApp' },
    { value: 'approved', label: '✅ Pagamento Aprovado' },
    { value: 'preparing', label: '👨‍🍳 Em Produção' },
    { value: 'ready', label: '📦 Separado p/ Entrega' },
    { value: 'delivering', label: '🛵 Em Entrega' },
    { value: 'delivered', label: '🎉 Entregue' },
    { value: 'cancelled', label: '🚫 Cancelado' },
    { value: 'rejected', label: '❌ Rejeitado' },
  ];

  const canCancel = (status: string) => {
    return !['delivered', 'cancelled', 'rejected'].includes(status);
  };

  const sendStatusNotification = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-status-notification', {
        body: { order_id: orderId, new_status: newStatus }
      });
      if (error) {
        console.error('Error sending notification:', error);
      }
    } catch (error) {
      console.error('Error invoking notification function:', error);
    }
  };

  const cancelOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'cancelled');
  };

  const [isConfirming, setIsConfirming] = useState<string | null>(null);

  const confirmOrder = async (orderId: string) => {
    setIsConfirming(orderId);
    
    try {
      // Update order status to approved
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'approved',
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error confirming order:', updateError);
        alert('Erro ao confirmar pedido');
        return;
      }

      // Call decrement-stock edge function
      const { error: decrementError } = await supabase.functions.invoke('decrement-stock', {
        body: { order_id: orderId }
      });

      if (decrementError) {
        console.error('Error decrementing stock:', decrementError);
        // Don't fail - order is confirmed, stock can be adjusted manually
      }

      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === orderId 
          ? { ...o, status: 'approved', paid_at: new Date().toISOString() } 
          : o
        )
      );

      // Close modal if this order was selected
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'approved', paid_at: new Date().toISOString() } : null);
      }

    } catch (error) {
      console.error('Error in confirmOrder:', error);
      alert('Erro ao confirmar pedido');
    } finally {
      setIsConfirming(null);
    }
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdatingStatus(orderId);
    
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order status:', updateError);
        alert('Erro ao atualizar status');
        return;
      }

      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === orderId 
          ? { ...o, status: newStatus } 
          : o
        )
      );

      // Update modal if open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }

      // Send notification for status change (except pending statuses)
      if (!['pending', 'whatsapp_pending'].includes(newStatus)) {
        sendStatusNotification(orderId, newStatus);
      }

    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      alert('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getNextStatusAction = (status: string): { label: string; nextStatus: string; icon: React.ReactNode; color: string } | null => {
    switch (status) {
      case 'approved':
        return { label: 'Iniciar Produção', nextStatus: 'preparing', icon: <ChefHat className="w-4 h-4" />, color: 'bg-blue-600 hover:bg-blue-700' };
      case 'preparing':
        return { label: 'Separar p/ Entrega', nextStatus: 'ready', icon: <Package className="w-4 h-4" />, color: 'bg-purple-600 hover:bg-purple-700' };
      case 'ready':
        return { label: 'Saiu p/ Entrega', nextStatus: 'delivering', icon: <Truck className="w-4 h-4" />, color: 'bg-amber-600 hover:bg-amber-700' };
      case 'delivering':
        return { label: 'Entregue', nextStatus: 'delivered', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-emerald-600 hover:bg-emerald-700' };
      default:
        return null;
    }
  };

  const openWhatsApp = (phone: string, name: string, orderId: string) => {
    const message = encodeURIComponent(
      `Olá ${name}! 😊\n\nSeu pedido #${orderId.slice(0, 8)} foi recebido com sucesso.\n\nPosso te ajudar com algo?`
    );
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const exportOrdersCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = ['ID', 'Status', 'Cliente', 'Email', 'Telefone', 'Entrega', 'Endereço', 'Subtotal', 'Frete', 'Total', 'Pago em', 'Criado em'];
    const rows = filteredOrders.map(order => [
      order.id.slice(0, 8),
      order.status,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.delivery_option === 'pickup' ? 'Retirada' : 'Entrega',
      order.delivery_address || '',
      order.subtotal.toFixed(2),
      order.delivery_fee.toFixed(2),
      order.total.toFixed(2),
      order.paid_at ? new Date(order.paid_at).toLocaleString('pt-BR') : '',
      new Date(order.created_at).toLocaleString('pt-BR'),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos-${statusFilter}-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-muted-foreground">Total de pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
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
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {stats.totalRevenue.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Receita</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pedidos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp_pending">📲 WhatsApp</SelectItem>
                <SelectItem value="pending">⏳ Aguardando</SelectItem>
                <SelectItem value="approved">✅ Pagos</SelectItem>
                <SelectItem value="preparing">👨‍🍳 Produção</SelectItem>
                <SelectItem value="ready">📦 Separados</SelectItem>
                <SelectItem value="delivering">🛵 Em Entrega</SelectItem>
                <SelectItem value="delivered">🎉 Entregues</SelectItem>
                <SelectItem value="cancelled">🚫 Cancelados</SelectItem>
                <SelectItem value="rejected">❌ Rejeitados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportOrdersCSV} disabled={filteredOrders.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pedido encontrado no período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Pedido</th>
                    <th className="pb-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Entrega</th>
                    <th className="pb-3 font-medium text-muted-foreground">Total</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Data</th>
                    <th className="pb-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-mono text-xs">#{order.id.slice(0, 8)}</p>
                      </td>
                      <td className="py-3">
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <p className="text-xs">
                          {order.delivery_option === 'pickup' ? '📍 Retirada' : '🛵 Entrega'}
                        </p>
                      </td>
                      <td className="py-3">
                        <p className="font-semibold text-primary">
                          R$ {order.total.toFixed(2).replace('.', ',')}
                        </p>
                      </td>
                      <td className="py-3">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {(order.status === 'whatsapp_pending' || order.status === 'pending') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmOrder(order.id)}
                              disabled={isConfirming === order.id}
                              title="Confirmar pedido"
                              className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            >
                              {isConfirming === order.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {getNextStatusAction(order.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, getNextStatusAction(order.status)!.nextStatus)}
                              disabled={isUpdatingStatus === order.id}
                              title={getNextStatusAction(order.status)!.label}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                            >
                              {isUpdatingStatus === order.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                getNextStatusAction(order.status)!.icon
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openWhatsApp(order.customer_phone, order.customer_name, order.id)}
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          {canCancel(order.status) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Cancelar pedido"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Cancelar Pedido
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja cancelar o pedido #{order.id.slice(0, 8)}?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => cancelOrder(order.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Cancelar Pedido
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              Pedido #{selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status with manual dropdown */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(newStatus) => updateOrderStatus(selectedOrder.id, newStatus)}
                    disabled={isUpdatingStatus === selectedOrder.id}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Alterar status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Customer */}
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Cliente</h4>
                <p className="text-sm">{selectedOrder.customer_name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customer_email}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customer_phone}</p>
              </div>

              {/* Delivery */}
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Entrega</h4>
                <p className="text-sm">
                  {selectedOrder.delivery_option === 'pickup' ? '📍 Retirada no Recreio' : '🛵 Entrega em domicílio'}
                </p>
                {selectedOrder.delivery_address && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedOrder.delivery_address}</p>
                )}
              </div>

              {/* Items */}
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Itens</h4>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="py-1.5 border-b last:border-0">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.name} ({item.quantity}x)</span>
                      <span>R$ {item.totalPrice.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {item.flavors && item.flavors.length > 0 && (
                      <div className="mt-1 ml-2 space-y-0.5">
                        {item.flavors.map((flavor, fi) => (
                          <p key={fi} className="text-xs text-muted-foreground">
                            • {flavor.quantity}x {flavor.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>R$ {selectedOrder.subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Entrega</span>
                      <span>R$ {selectedOrder.delivery_fee.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Criado: {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</span>
                </div>
                {selectedOrder.paid_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Pago: {new Date(selectedOrder.paid_at).toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>

              {/* UTM Data */}
              {selectedOrder.utm_data && Object.keys(selectedOrder.utm_data).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Origem: </span>
                  {selectedOrder.utm_data.utm_source || 'Direto'}
                  {selectedOrder.utm_data.utm_campaign && ` / ${selectedOrder.utm_data.utm_campaign}`}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {/* Confirm pending orders */}
                {(selectedOrder.status === 'whatsapp_pending' || selectedOrder.status === 'pending') && (
                  <Button
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => confirmOrder(selectedOrder.id)}
                    disabled={isConfirming === selectedOrder.id}
                  >
                    {isConfirming === selectedOrder.id ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Confirmar Pedido
                  </Button>
                )}

                {/* Next status action */}
                {getNextStatusAction(selectedOrder.status) && (
                  <Button
                    variant="default"
                    className={`w-full ${getNextStatusAction(selectedOrder.status)!.color}`}
                    onClick={() => updateOrderStatus(selectedOrder.id, getNextStatusAction(selectedOrder.status)!.nextStatus)}
                    disabled={isUpdatingStatus === selectedOrder.id}
                  >
                    {isUpdatingStatus === selectedOrder.id ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      getNextStatusAction(selectedOrder.status)!.icon
                    )}
                    <span className="ml-2">{getNextStatusAction(selectedOrder.status)!.label}</span>
                  </Button>
                )}

                {/* WhatsApp button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openWhatsApp(selectedOrder.customer_phone, selectedOrder.customer_name, selectedOrder.id)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar WhatsApp
                </Button>

                {/* Cancel button */}
                {canCancel(selectedOrder.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Cancelar Pedido
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          Cancelar Pedido
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja cancelar o pedido #{selectedOrder.id.slice(0, 8)}?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelOrder(selectedOrder.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Cancelar Pedido
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersManager;
