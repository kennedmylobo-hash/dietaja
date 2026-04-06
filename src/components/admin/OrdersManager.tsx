import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPhoneVariations } from "@/lib/phone";
import { useOrderCostCalculator, calculateOrderCost } from "@/hooks/useOrderCostCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFlavorDescription, mapLineTypeToKey } from "@/lib/flavor-description";
import type { Json } from "@/integrations/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  History,
  QrCode,
  Copy,
  Check,
  Link as LinkIcon,
  Printer,
  Pencil,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { printOrderTicket } from "@/lib/print-utils";
import { printOrderProduction, generateOrderProductionWhatsApp } from "@/lib/order-production-utils";
import { shareViaWhatsApp } from "@/lib/print-utils";
import { printThermalTicket } from "@/lib/thermal-print";
import OrderConfirmationModal from "@/components/admin/OrderConfirmationModal";
import type { ConfirmItem } from "@/components/admin/OrderConfirmationModal";
import { parseSides, generateDefaultSides } from "@/lib/flavor-description";

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
  lineType?: string;
  flavors?: FlavorItem[];
}

interface Order {
  id: string;
  order_number: string | null;
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
  cancellation_type?: string | null;
  discount_amount?: number | null;
  coupon_code?: string | null;
  tenant_id?: string | null;
}

interface StatusHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

interface OrdersManagerProps {
  dateFilter: 'today' | 'week' | 'month';
}

const OrdersManager = ({ dateFilter }: OrdersManagerProps) => {
  const { settings: pricingSettings, loaded: pricingLoaded } = useOrderCostCalculator();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [lastStatusChanges, setLastStatusChanges] = useState<Record<string, string>>({});
  const [cancellationTypeFilter, setCancellationTypeFilter] = useState<string>('all');
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState('');

  // Flavor compositions for order detail
  const [flavorSidesMap, setFlavorSidesMap] = useState<Record<string, Json | null>>({});

  // Editing flavor composition state
  const [editingFlavorItems, setEditingFlavorItems] = useState<ConfirmItem[] | null>(null);
  const [editingLineType, setEditingLineType] = useState<"fit" | "fitness" | "personalizada">("fit");
  // Map from flavor name to its DB id for editing
  const [flavorIdMap, setFlavorIdMap] = useState<Record<string, string>>({});

  // Delete a flavor from an order and recalculate totals
  const handleDeleteFlavor = async (itemIndex: number, flavorIndex: number) => {
    if (!selectedOrder) return;
    const updatedItems = selectedOrder.items.map((item, i) => {
      if (i !== itemIndex || !item.flavors) return item;
      const updatedFlavors = item.flavors.filter((_, fi) => fi !== flavorIndex);
      const removedFlavor = item.flavors[flavorIndex];
      const newQuantity = item.quantity - (removedFlavor?.quantity || 0);
      // Recalculate totalPrice proportionally
      const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : 0;
      const newTotalPrice = unitPrice * newQuantity;
      return { ...item, flavors: updatedFlavors, quantity: newQuantity, totalPrice: Math.round(newTotalPrice * 100) / 100 };
    }).filter(item => item.quantity > 0 && (!item.flavors || item.flavors.length > 0));

    const newSubtotal = updatedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const discountAmount = selectedOrder.discount_amount || 0;
    const newTotal = newSubtotal + (selectedOrder.delivery_fee || 0) - discountAmount;

    const { error } = await supabase
      .from('orders')
      .update({ items: updatedItems as any, subtotal: newSubtotal, total: newTotal })
      .eq('id', selectedOrder.id);

    if (error) {
      toast({ title: "Erro ao excluir sabor", description: error.message, variant: "destructive" });
      return;
    }

    const updatedOrder = { ...selectedOrder, items: updatedItems, subtotal: newSubtotal, total: newTotal };
    setSelectedOrder(updatedOrder);
    setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
    toast({ title: "Sabor removido!", description: "Pedido recalculado automaticamente." });
  };

  const [isGeneratingPix, setIsGeneratingPix] = useState<string | null>(null);
  const [pixResult, setPixResult] = useState<{
    pix_code: string;
    pix_link: string;
    qr_code_base64: string;
    whatsapp_sent: boolean;
    email_sent: boolean;
    total: number;
    reused?: boolean;
  } | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  // Juice/Soup ingredient descriptions for printing
  const [ingredientDescMap, setIngredientDescMap] = useState<Record<string, string>>({});

  // Tracking Link Modal states
  const [trackingModal, setTrackingModal] = useState<{ orderId: string; show: boolean }>({ orderId: '', show: false });
  const [trackingLink, setTrackingLink] = useState('');

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

  // Carregar histórico e composições quando um pedido é selecionado
  useEffect(() => {
    if (selectedOrder?.id) {
      fetchStatusHistory(selectedOrder.id);
      // Fetch flavor compositions for marmita items
      const hasMarmita = selectedOrder.items.some(i => i.type === 'marmita');
      if (hasMarmita) {
        supabase
          .from('marmita_flavors')
          .select('id, name, sides')
          .then(({ data }) => {
            if (data) {
              const map: Record<string, Json | null> = {};
              const idMap: Record<string, string> = {};
              data.forEach(f => { 
                map[f.name] = f.sides; 
                idMap[f.name] = f.id;
              });
              setFlavorSidesMap(map);
              setFlavorIdMap(idMap);
            }
          });
      }
      // Fetch juice/soup ingredient descriptions for kit items
      const hasKit = selectedOrder.items.some(i => i.type === 'kit');
      if (hasKit) {
        Promise.all([
          supabase.from('kit_juices').select('name, ingredients'),
          supabase.from('kit_soups').select('name, ingredients'),
        ]).then(([juicesRes, soupsRes]) => {
          const descMap: Record<string, string> = {};
          juicesRes.data?.forEach(j => { if (j.ingredients) descMap[j.name] = j.ingredients; });
          soupsRes.data?.forEach(s => { if (s.ingredients) descMap[s.name] = s.ingredients; });
          setIngredientDescMap(descMap);
        });
      }
    }
  }, [selectedOrder?.id]);

  // Fetch last status change timestamp for each order
  const fetchLastStatusChanges = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    
    const { data } = await supabase
      .from('order_status_history')
      .select('order_id, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false });

    if (data) {
      const latestChanges: Record<string, string> = {};
      data.forEach((entry) => {
        if (!latestChanges[entry.order_id]) {
          latestChanges[entry.order_id] = entry.created_at;
        }
      });
      setLastStatusChanges(latestChanges);
    }
  };

  useEffect(() => {
    if (orders.length > 0) {
      fetchLastStatusChanges(orders.map(o => o.id));
    }
  }, [orders]);

  const getTimeSinceOrder = (createdAt: string): string => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    const remainingMinutes = diffMinutes % 60;

    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h ${remainingMinutes}min`;
    if (diffDays === 1) return `1d ${remainingHours}h`;
    return `${diffDays}d ${remainingHours}h`;
  };

  // Group orders by status category (6 stages)
  const isOperationallyApproved = (status: string) => ['approved', 'paid'].includes(status);

  const ordersByCategory = useMemo(() => {
    return {
      pending: orders.filter(o => ['pending', 'whatsapp_pending', 'awaiting_payment'].includes(o.status)),
      production: orders.filter(o => [...['preparing'], ...['approved', 'paid']].includes(o.status)),
      ready: orders.filter(o => o.status === 'ready'),
      delivering: orders.filter(o => o.status === 'delivering'),
      delivered: orders.filter(o => o.status === 'delivered'),
      cancelled: orders.filter(o => ['cancelled', 'rejected'].includes(o.status)),
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'approved') return orders.filter(o => isOperationallyApproved(o.status));
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const stats = useMemo(() => {
    const approved = orders.filter(o => isOperationallyApproved(o.status));
    const preparing = orders.filter(o => o.status === 'preparing');
    const ready = orders.filter(o => o.status === 'ready');
    const delivering = orders.filter(o => o.status === 'delivering');
    const delivered = orders.filter(o => o.status === 'delivered');
    const pending = orders.filter(o => o.status === 'pending');
    const whatsappPending = orders.filter(o => o.status === 'whatsapp_pending');
    const awaitingPayment = orders.filter(o => o.status === 'awaiting_payment');
    const rejected = orders.filter(o => o.status === 'rejected');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const totalRevenue = [...approved, ...preparing, ...ready, ...delivering, ...delivered].reduce((sum, o) => sum + o.total, 0);
    
    const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'rejected').length;
    
    return { 
      activeOrders,
      approved: approved.length, 
      preparing: preparing.length,
      ready: ready.length,
      delivering: delivering.length,
      delivered: delivered.length,
      pending: pending.length + whatsappPending.length + awaitingPayment.length, 
      whatsappPending: whatsappPending.length,
      awaitingPayment: awaitingPayment.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      totalRevenue 
    };
  }, [orders]);

  // Detect customers with multiple pending orders (potential orphans)
  const duplicateCustomers = useMemo(() => {
    const pendingOrders = orders.filter(o => 
      ['pending', 'awaiting_payment', 'whatsapp_pending'].includes(o.status)
    );
    
    // Group by email
    const byEmail = pendingOrders.reduce((acc, order) => {
      const email = order.customer_email;
      if (!acc[email]) acc[email] = [];
      acc[email].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
    
    // Filter only emails with more than 1 order
    return Object.entries(byEmail)
      .filter(([_, orders]) => orders.length > 1)
      .map(([email, orders]) => ({
        email,
        orders,
        customerName: orders[0].customer_name,
        count: orders.length
      }));
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">✅ Pago</Badge>;
      case 'preparing':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">👨‍🍳 Produção</Badge>;
      case 'ready':
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">📦 Pronto</Badge>;
      case 'delivering':
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">🛵 Em Entrega</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">⏳ PIX Pendente</Badge>;
      case 'awaiting_payment':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">💳 Aguardando Pagamento</Badge>;
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

  const getPaymentMethodBadge = (method: string | null) => {
    switch (method) {
      case 'pix':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">💚 PIX</Badge>;
      case 'credit_card':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">💳 Cartão Crédito</Badge>;
      case 'debit_card':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">💳 Cartão Débito</Badge>;
      case 'account_money':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">💰 Saldo MP</Badge>;
      case 'manual':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">✋ Manual</Badge>;
      case 'na_entrega':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">🚚 Na Entrega</Badge>;
      case 'whatsapp':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">📱 WhatsApp</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">⏳ Aguardando</Badge>;
    }
  };

  const ALL_STATUSES = [
    { value: 'awaiting_payment', label: '💳 Aguardando Pagamento' },
    { value: 'pending', label: '⏳ PIX Pendente' },
    { value: 'whatsapp_pending', label: '📲 WhatsApp' },
    { value: 'approved', label: '✅ Pagamento Aprovado' },
    { value: 'paid', label: '✅ Pagamento Aprovado' },
    { value: 'preparing', label: '👨‍🍳 Em Produção' },
    { value: 'ready', label: '📦 Pronto p/ Retirada/Entrega' },
    { value: 'delivering', label: '🛵 Em Entrega' },
    { value: 'delivered', label: '🎉 Entregue' },
    { value: 'cancelled', label: '🚫 Cancelado' },
    { value: 'rejected', label: '❌ Rejeitado' },
  ];

  const canCancel = (status: string) => {
    return !['delivered', 'cancelled', 'rejected'].includes(status);
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'Novo';
    const found = ALL_STATUSES.find(s => s.value === status);
    return found ? found.label : status;
  };

  const fetchStatusHistory = async (orderId: string) => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching status history:', error);
    } else {
      setStatusHistory((data as StatusHistoryEntry[]) || []);
    }
    setIsLoadingHistory(false);
  };

  const recordStatusChange = async (orderId: string, previousStatus: string, newStatus: string, notes?: string) => {
    try {
      // Get current user for attribution
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          previous_status: previousStatus,
          new_status: newStatus,
          changed_by: user?.id || null,
          changed_by_name: user?.email?.split('@')[0] || 'Admin',
          notes: notes || null
        });

      if (error) {
        console.error('Error recording status change:', error);
      }
    } catch (error) {
      console.error('Error in recordStatusChange:', error);
    }
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

  const cancelOrder = async (orderId: string, reason: string) => {
    setIsUpdatingStatus(orderId);
    
    try {
      const currentOrder = orders.find(o => o.id === orderId);
      const previousStatus = currentOrder?.status || 'unknown';

      // First, try to cancel the payment in Asaas
      console.log('Attempting to cancel Asaas payment for order:', orderId);
      try {
        const { data: cancelResult, error: cancelError } = await supabase.functions.invoke('cancel-asaas-payment', {
          body: { order_id: orderId }
        });
        
        if (cancelError) {
          console.error('Error calling cancel-asaas-payment:', cancelError);
        } else {
          console.log('Asaas cancellation result:', cancelResult);
        }
      } catch (asaasError) {
        console.error('Error cancelling Asaas payment:', asaasError);
        // Continue with order cancellation even if Asaas fails
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancellation_type: 'manual'
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error cancelling order:', updateError);
        alert('Erro ao cancelar pedido');
        return;
      }

      // Record the status change with the reason
      await recordStatusChange(orderId, previousStatus, 'cancelled', reason);

      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === orderId 
          ? { ...o, status: 'cancelled' } 
          : o
        )
      );

      // Update modal if open and refresh history
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
        fetchStatusHistory(orderId);
      }

      // Send notification (skip for WhatsApp imported orders)
      const isWhatsAppImport = currentOrder?.utm_data?.source === 'whatsapp_import';
      if (!isWhatsAppImport) {
        sendStatusNotification(orderId, 'cancelled');
      }

      // Clear cancel state
      setOrderToCancel(null);
      setCancelReason('');

    } catch (error) {
      console.error('Error in cancelOrder:', error);
      alert('Erro ao cancelar pedido');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Bulk cancel all orphan orders for a specific customer
  const bulkCancelOrphanOrders = async (ordersToCancel: Order[], reason: string) => {
    setIsBulkCancelling(true);
    
    try {
      const cancelPromises = ordersToCancel.map(async (order) => {
        // Cancel in Asaas
        try {
          await supabase.functions.invoke('cancel-asaas-payment', {
            body: { order_id: order.id }
          });
        } catch (asaasError) {
          console.error('Asaas cancel error for order:', order.id, asaasError);
        }
        
        // Update order in database
        await supabase.from('orders').update({
          status: 'cancelled',
          cancellation_type: 'manual_bulk'
        }).eq('id', order.id);
        
        // Record in history
        await recordStatusChange(
          order.id, 
          order.status, 
          'cancelled', 
          reason || 'Cancelamento em lote de pedidos órfãos'
        );
      });
      
      await Promise.all(cancelPromises);
      
      // Update local state
      setOrders(prev => prev.map(o => 
        ordersToCancel.find(c => c.id === o.id) 
          ? { ...o, status: 'cancelled', cancellation_type: 'manual_bulk' } 
          : o
      ));
      
      setBulkCancelReason('');
      
    } catch (error) {
      console.error('Error in bulkCancelOrphanOrders:', error);
      alert('Erro ao cancelar pedidos em lote');
    } finally {
      setIsBulkCancelling(false);
    }
  };

  const [isConfirming, setIsConfirming] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState<string | null>(null);

  const recoverOrder = async (orderId: string) => {
    setIsRecovering(orderId);
    
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'pending', 
          cancellation_type: null 
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error recovering order:', updateError);
        alert('Erro ao recuperar pedido');
        return;
      }

      // Record the status change in history
      await recordStatusChange(orderId, 'cancelled', 'pending', 'Pedido recuperado manualmente');

      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === orderId 
          ? { ...o, status: 'pending', cancellation_type: null } 
          : o
        )
      );

      // Update modal if open and refresh history
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'pending', cancellation_type: null } : null);
        fetchStatusHistory(orderId);
      }

    } catch (error) {
      console.error('Error in recoverOrder:', error);
      alert('Erro ao recuperar pedido');
    } finally {
      setIsRecovering(null);
    }
  };

  const confirmOrder = async (orderId: string) => {
    setIsConfirming(orderId);
    
    try {
      // Get current status before updating
      const currentOrder = orders.find(o => o.id === orderId);
      const previousStatus = currentOrder?.status || 'pending';

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

      // Record the status change in history
      await recordStatusChange(orderId, previousStatus, 'approved');

      // Cancel orphan orders from same customer
      if (currentOrder?.customer_email) {
        const { error: cancelError } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('customer_email', currentOrder.customer_email)
          .in('status', ['pending', 'awaiting_payment'])
          .neq('id', orderId);
        
        if (cancelError) {
          console.error('Error cancelling orphan orders:', cancelError);
        } else {
          console.log('✅ Orphan orders cancelled for:', currentOrder.customer_email);
        }
      }

      // Call decrement-stock edge function
      const { error: decrementError } = await supabase.functions.invoke('decrement-stock', {
        body: { order_id: orderId }
      });

      if (decrementError) {
        console.error('Error decrementing stock:', decrementError);
        // Don't fail - order is confirmed, stock can be adjusted manually
      }

      // Send order confirmation email
      try {
        await supabase.functions.invoke('send-order-approved', {
          body: {
            order_number: currentOrder?.order_number || orderId.slice(0, 8),
            customer_email: currentOrder?.customer_email,
            customer_name: currentOrder?.customer_name,
            customer_phone: currentOrder?.customer_phone,
            items: currentOrder?.items,
            subtotal: currentOrder?.subtotal,
            delivery_fee: currentOrder?.delivery_fee || 0,
            total: currentOrder?.total,
            delivery_option: currentOrder?.delivery_option,
            delivery_address: currentOrder?.delivery_address,
            payment_method: currentOrder?.payment_method || 'manual',
            tenant_id: currentOrder?.tenant_id,
          }
        });
       console.log('✅ Email + WhatsApp confirmation sent via send-order-approved');
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }

      // Mark associated cart as converted
      if (currentOrder?.customer_phone) {
        await markCartAsConverted(currentOrder.customer_phone);
      }

      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === orderId 
          ? { ...o, status: 'approved', paid_at: new Date().toISOString() } 
          : o
        )
      );

      // Close modal if this order was selected and refresh history
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'approved', paid_at: new Date().toISOString() } : null);
        fetchStatusHistory(orderId);
      }

    } catch (error) {
      console.error('Error in confirmOrder:', error);
      alert('Erro ao confirmar pedido');
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

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Payment approval prompt state
  const [paymentPrompt, setPaymentPrompt] = useState<{ orderId: string; newStatus: string; trackingLinkValue?: string } | null>(null);

  const updateOrderStatus = async (orderId: string, newStatus: string, trackingLinkValue?: string) => {
    // If status is "delivering" and we don't have a tracking link decision yet, open modal
    if (newStatus === 'delivering' && trackingLinkValue === undefined) {
      setTrackingModal({ orderId, show: true });
      setTrackingLink('');
      return;
    }

    // Check if order is unpaid and being moved to a production/delivery status
    const currentOrder = orders.find(o => o.id === orderId);
    const unpaidStatuses = ['pending', 'whatsapp_pending', 'awaiting_payment'];
    const productionStatuses = ['preparing', 'ready', 'delivering', 'delivered'];
    
    if (currentOrder && unpaidStatuses.includes(currentOrder.status) && productionStatuses.includes(newStatus) && !paymentPrompt) {
      // Show payment approval prompt
      setPaymentPrompt({ orderId, newStatus, trackingLinkValue });
      return;
    }

    // Clear payment prompt if it was open
    setPaymentPrompt(null);

    setIsUpdatingStatus(orderId);
    
    try {
      const previousStatus = currentOrder?.status || 'unknown';

      // Build update object
      const updateData: { status: string; tracking_link?: string | null } = { status: newStatus };
      if (newStatus === 'delivering') {
        updateData.tracking_link = trackingLinkValue || null;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order status:', updateError);
        alert('Erro ao atualizar status');
        return;
      }

      // Record the status change in history
      const notes = trackingLinkValue ? `Link de rastreio: ${trackingLinkValue}` : undefined;
      await recordStatusChange(orderId, previousStatus, newStatus, notes);

      // Update local state
      setOrders(prev => 
        prev.map(o => o.id === orderId 
          ? { ...o, status: newStatus } 
          : o
        )
      );

      // Update modal if open and refresh history
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
        fetchStatusHistory(orderId);
      }

      // Send notification for status change (except pending statuses and WhatsApp imports)
      const isWhatsAppImportStatus = (currentOrder?.utm_data as any)?.source === 'whatsapp_import';
      if (!['pending', 'whatsapp_pending'].includes(newStatus) && !isWhatsAppImportStatus) {
        sendStatusNotification(orderId, newStatus);
      }

      // Close tracking modal if open
      setTrackingModal({ orderId: '', show: false });
      setTrackingLink('');

    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      alert('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Handle payment prompt: approve payment first, then proceed with status change
  const handlePaymentPromptApprove = async () => {
    if (!paymentPrompt) return;
    const { orderId, newStatus, trackingLinkValue } = paymentPrompt;
    
    // First confirm/approve the order (handles payment, stock, notifications)
    await confirmOrder(orderId);
    
    // Then if the target status is beyond 'approved', continue updating
    if (newStatus !== 'approved' && newStatus !== 'preparing') {
      // Small delay to let the confirmOrder finish
      setTimeout(() => {
        setPaymentPrompt(null);
        updateOrderStatus(orderId, newStatus, trackingLinkValue);
      }, 500);
    } else if (newStatus === 'preparing') {
      // Confirm then move to preparing
      setTimeout(() => {
        setPaymentPrompt(null);
        updateOrderStatus(orderId, 'preparing', trackingLinkValue);
      }, 500);
    } else {
      setPaymentPrompt(null);
    }
  };

  // Handle payment prompt: skip payment, just change status
  const handlePaymentPromptSkip = () => {
    if (!paymentPrompt) return;
    const { orderId, newStatus, trackingLinkValue } = paymentPrompt;
    setPaymentPrompt(null);
    // Force the update by calling with paymentPrompt already cleared
    updateOrderStatus(orderId, newStatus, trackingLinkValue);
  };

  const handleSendToDelivery = (withLink: boolean) => {
    const orderId = trackingModal.orderId;
    const link = withLink ? trackingLink.trim() : '';
    updateOrderStatus(orderId, 'delivering', link);
  };

  const getNextStatusAction = (status: string): { label: string; nextStatus: string; icon: React.ReactNode; color: string } | null => {
    switch (status) {
      case 'approved':
      case 'paid':
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

  // Generate PIX for order from admin panel
  const generatePixForOrder = async (orderId: string) => {
    setIsGeneratingPix(orderId);
    setCopiedField(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-pix-admin', {
        body: { order_id: orderId, send_whatsapp: true, send_email: true }
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }
      
      setPixResult({
        pix_code: data.pix_code,
        pix_link: data.pix_link,
        qr_code_base64: data.qr_code_base64,
        whatsapp_sent: data.notifications?.whatsapp_sent || false,
        email_sent: data.notifications?.email_sent || false,
        total: data.total,
        reused: data.reused,
      });
      setShowPixModal(true);
      
      toast({ 
        title: data.reused ? "PIX existente recuperado!" : "PIX gerado com sucesso!", 
        description: "Notificações enviadas ao cliente." 
      });
    } catch (err) {
      console.error('Error generating PIX:', err);
      toast({ 
        title: "Erro ao gerar PIX", 
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingPix(null);
    }
  };

  const copyToClipboard = async (text: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: "Copiado!", description: field === 'code' ? "Código PIX copiado" : "Link copiado" });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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

  const renderOrdersTable = (ordersList: Order[]) => {
    if (ordersList.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-8">
          Nenhum pedido nesta categoria.
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 font-medium text-muted-foreground">Pedido</th>
              <th className="pb-3 font-medium text-muted-foreground">Cliente</th>
              <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Entrega</th>
              <th className="pb-3 font-medium text-muted-foreground">Total</th>
              <th className="pb-3 font-medium text-muted-foreground">Status</th>
              <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Pagamento</th>
              <th className="pb-3 font-medium text-muted-foreground hidden sm:table-cell">Tempo</th>
              <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Data</th>
              <th className="pb-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordersList.map((order) => (
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
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(order.status)}
                    {order.status === 'cancelled' && order.cancellation_type && (
                      <Badge 
                        variant="outline" 
                        className={
                          order.cancellation_type === 'manual' 
                            ? 'bg-red-50 text-red-700 border-red-200 text-[10px]' 
                            : 'bg-muted text-muted-foreground border-border text-[10px]'
                        }
                      >
                        {order.cancellation_type === 'manual' ? '🙋 Manual' : 
                         order.cancellation_type === 'auto_orphan' ? '🤖 Órfão' : 
                         order.cancellation_type === 'auto_expired' ? '⏰ Expirado' : ''}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 hidden lg:table-cell">
                  {getPaymentMethodBadge(order.payment_method)}
                </td>
                <td className="py-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">
                      {getTimeSinceOrder(order.created_at)}
                    </span>
                  </div>
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
                    {['whatsapp_pending', 'pending', 'awaiting_payment'].includes(order.status) && (
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
                    {order.status === 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => recoverOrder(order.id)}
                        disabled={isRecovering === order.id}
                        title="Recuperar pedido"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                      >
                        {isRecovering === order.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {canCancel(order.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Cancelar pedido"
                        className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                        onClick={() => setOrderToCancel(order)}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
                <p className="text-2xl font-bold">{stats.activeOrders}</p>
                <p className="text-xs text-muted-foreground">Pedidos ativos</p>
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

      {/* Alert for potential orphan orders */}
      {duplicateCustomers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-amber-800 mb-1">
              ⚠️ Potenciais Pedidos Órfãos Detectados
            </h4>
            <p className="text-sm text-amber-700 mb-2">
              {duplicateCustomers.length === 1 
                ? `1 cliente tem múltiplos pedidos pendentes.`
                : `${duplicateCustomers.length} clientes têm múltiplos pedidos pendentes.`
              } Considere verificar e cancelar manualmente os duplicados.
            </p>
            <div className="space-y-3">
              {duplicateCustomers.map(({ email, customerName, count, orders }) => (
                <div key={email} className="flex flex-col gap-2 p-3 bg-amber-100/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Badge variant="outline" className="bg-amber-100 border-amber-300">
                      {count} pedidos
                    </Badge>
                    <span className="font-medium text-amber-800">{customerName}</span>
                    <span className="text-amber-600">({email})</span>
                  </div>
                  <div className="text-xs text-amber-500">
                    {orders.map(o => `#${o.order_number || o.id.slice(0,6)}`).join(', ')}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="w-fit"
                        disabled={isBulkCancelling}
                      >
                        <Ban className="w-3 h-3 mr-1" />
                        Cancelar Todos os {count} Pedidos
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar {count} pedidos?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div>
                            <p className="mb-3">
                              Todos os pedidos pendentes de <strong>{customerName}</strong> serão cancelados.
                              Os pagamentos PIX também serão cancelados no Asaas.
                            </p>
                            <div className="bg-muted p-2 rounded text-xs max-h-32 overflow-y-auto">
                              {orders.map(o => (
                                <div key={o.id} className="py-1 border-b last:border-0">
                                  #{o.order_number || o.id.slice(0,6)} - R$ {o.total.toFixed(2).replace('.', ',')}
                                </div>
                              ))}
                            </div>
                            <Textarea
                              placeholder="Motivo do cancelamento (opcional)"
                              value={bulkCancelReason}
                              onChange={(e) => setBulkCancelReason(e.target.value)}
                              className="mt-3"
                              rows={2}
                            />
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkCancelling}>Voltar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => bulkCancelOrphanOrders(orders, bulkCancelReason)}
                          disabled={isBulkCancelling}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {isBulkCancelling ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Cancelando...
                            </>
                          ) : (
                            <>Sim, Cancelar Todos</>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tabs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pedidos
          </CardTitle>
          <div className="flex items-center gap-2">
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
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
              <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Pagamento</span>
                {ordersByCategory.pending.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{ordersByCategory.pending.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="production" className="gap-1 text-xs sm:text-sm">
                <ChefHat className="w-4 h-4" />
                <span className="hidden sm:inline">Produção</span>
                {ordersByCategory.production.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{ordersByCategory.production.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ready" className="gap-1 text-xs sm:text-sm">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Pronto</span>
                {ordersByCategory.ready.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{ordersByCategory.ready.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="delivering" className="gap-1 text-xs sm:text-sm">
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">Entrega</span>
                {ordersByCategory.delivering.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{ordersByCategory.delivering.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="delivered" className="gap-1 text-xs sm:text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Concluídos</span>
                {ordersByCategory.delivered.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{ordersByCategory.delivered.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="gap-1 text-xs sm:text-sm">
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Cancelados</span>
                {ordersByCategory.cancelled.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{ordersByCategory.cancelled.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {renderOrdersTable(ordersByCategory.pending)}
            </TabsContent>

            <TabsContent value="production">
              {renderOrdersTable(ordersByCategory.production)}
            </TabsContent>

            <TabsContent value="ready">
              {renderOrdersTable(ordersByCategory.ready)}
            </TabsContent>

            <TabsContent value="delivering">
              {renderOrdersTable(ordersByCategory.delivering)}
            </TabsContent>

            <TabsContent value="delivered">
              {renderOrdersTable(ordersByCategory.delivered)}
            </TabsContent>

            <TabsContent value="cancelled">
              {/* Cancellation type filter */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-muted-foreground">Filtrar por tipo:</span>
                <Select value={cancellationTypeFilter} onValueChange={setCancellationTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo de cancelamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="manual">🙋 Manual</SelectItem>
                    <SelectItem value="auto_orphan">🤖 Órfão (Auto)</SelectItem>
                    <SelectItem value="auto_expired">⏰ Expirado (Auto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {renderOrdersTable(
                cancellationTypeFilter === 'all'
                  ? ordersByCategory.cancelled
                  : ordersByCategory.cancelled.filter(o => o.cancellation_type === cancellationTypeFilter)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog 
        open={!!selectedOrder} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setStatusHistory([]);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pedido #{selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-4">
              <div className="space-y-4 pb-4">
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

              {/* Payment Method */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Pagamento</span>
                {getPaymentMethodBadge(selectedOrder.payment_method)}
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
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  Itens
                  <Badge variant="secondary" className="text-xs">
                    {selectedOrder.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)} marmitas
                  </Badge>
                </h4>
                {selectedOrder.items.map((item, i) => {
                  // Infer line type for marmita items
                  const isPersonalizada = item.lineType === 'personalizada' || /personalizada/i.test(item.name);
                  const inferredLineType = item.type === 'marmita'
                    ? isPersonalizada
                      ? 'personalizada'
                      : (item.lineType === 'hipertrofia' || item.lineType === 'fitness'
                        || /hipertrofia|fitness/i.test(item.name)
                        ? 'fitness' : 'fit')
                    : null;
                  const lineWeight = inferredLineType === 'fitness' ? '450g' : inferredLineType === 'personalizada' ? '' : '300g';
                  const lineLabel = inferredLineType === 'fitness' ? 'FITNESS' : inferredLineType === 'personalizada' ? 'PERSONALIZADA' : 'FIT';

                  return (
                    <div key={i} className="py-1.5 border-b last:border-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1.5 flex-wrap">
                          {item.quantity}x {item.name}
                          {inferredLineType && (
                            <Badge
                              variant="outline"
                              className={inferredLineType === 'fitness'
                                ? 'bg-blue-500/10 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0'
                                : inferredLineType === 'personalizada'
                                  ? 'bg-orange-500/10 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0'
                                  : 'bg-green-500/10 text-green-700 border-green-200 text-[10px] px-1.5 py-0'}
                            >
                              {inferredLineType === 'fitness' ? '💪' : inferredLineType === 'personalizada' ? '📋' : '🥗'} {lineLabel} {lineWeight}
                            </Badge>
                          )}
                        </span>
                        <span className="shrink-0">R$ {item.totalPrice.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {item.flavors && item.flavors.length > 0 && (
                        <div className="mt-1 ml-2 space-y-1">
                          {item.flavors.map((flavor, fi) => {
                            let sidesData = flavorSidesMap[flavor.name] ?? null;
                            if (!sidesData) {
                              const stopWords = new Set(['com', 'de', 'e', 'em', 'ao', 'a', 'o', 'mix', 'da', 'do']);
                              const extractWords = (str: string) =>
                                str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                  .split(/[\s,]+/).filter(w => w.length > 1 && !stopWords.has(w));
                              const targetWords = extractWords(flavor.name);
                              let bestMatch = '';
                              let bestScore = 0;
                              for (const key of Object.keys(flavorSidesMap)) {
                                const keyWords = extractWords(key);
                                const overlap = targetWords.filter(w => keyWords.includes(w)).length;
                                const score = overlap / Math.max(targetWords.length, keyWords.length);
                                if (score > bestScore && score >= 0.3) {
                                  bestScore = score;
                                  bestMatch = key;
                                }
                              }
                              if (bestMatch) sidesData = flavorSidesMap[bestMatch];
                            }
                            const composition = inferredLineType && inferredLineType !== 'personalizada' ? getFlavorDescription(sidesData, inferredLineType) : null;
                            return (
                              <div key={fi} className="flex items-start gap-1">
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground">
                                    • {flavor.quantity || (flavor as any).qty || 0}x {flavor.name}
                                  </p>
                                  {composition && (
                                    <p className="text-[10px] text-muted-foreground/70 ml-3">
                                      {composition}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                {inferredLineType && inferredLineType !== 'personalizada' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    title="Editar composição"
                                    onClick={() => {
                                      let matchedName = flavor.name;
                                      let flavorId = flavorIdMap[flavor.name] || null;
                                      if (!flavorId) {
                                        const stopWords = new Set(['com', 'de', 'e', 'em', 'ao', 'a', 'o', 'mix', 'da', 'do']);
                                        const extractWords = (str: string) =>
                                          str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                            .split(/[\s,]+/).filter(w => w.length > 1 && !stopWords.has(w));
                                        const targetWords = extractWords(flavor.name);
                                        let bestScore = 0;
                                        for (const key of Object.keys(flavorIdMap)) {
                                          const keyWords = extractWords(key);
                                          const overlap = targetWords.filter(w => keyWords.includes(w)).length;
                                          const score = overlap / Math.max(targetWords.length, keyWords.length);
                                          if (score > bestScore && score >= 0.3) {
                                            bestScore = score;
                                            matchedName = key;
                                            flavorId = flavorIdMap[key];
                                          }
                                        }
                                      }

                                      const sidesRaw = flavorSidesMap[matchedName] ?? null;
                                      const parsed = parseSides(sidesRaw);
                                      const lineKey = inferredLineType === 'fitness' ? 'hipertrofia' : 'emagrecimento';
                                      const existingSides = parsed?.[lineKey] || [];

                                      const confirmItem: ConfirmItem = {
                                        name: flavor.name,
                                        matchedName,
                                        quantity: flavor.quantity,
                                        flavorId,
                                        sides: existingSides.length > 0
                                          ? existingSides.map(s => ({ ...s }))
                                          : generateDefaultSides(matchedName, inferredLineType),
                                      };

                                      setEditingFlavorItems([confirmItem]);
                                      setEditingLineType(inferredLineType as "fit" | "fitness");
                                    }}
                                  >
                                    <Pencil className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    title="Excluir sabor"
                                    onClick={() => {
                                      if (window.confirm(`Excluir "${flavor.quantity}x ${flavor.name}" deste pedido?`)) {
                                        handleDeleteFlavor(i, fi);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive/70" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                   {/* Estimated Cost & Margin */}
                   {pricingLoaded && selectedOrder.items.some((i: any) => i.type === 'marmita' && i.flavors?.length) && (() => {
                     const costResult = calculateOrderCost(selectedOrder.items, flavorSidesMap, pricingSettings);
                     if (costResult.totalCost <= 0) return null;
                     const marginColor = costResult.marginPercent >= 50 ? 'text-green-600' : costResult.marginPercent >= 30 ? 'text-amber-600' : 'text-red-600';
                     return (
                       <>
                         <div className="flex justify-between text-sm">
                           <span className="text-muted-foreground">Custo estimado</span>
                           <span className="text-muted-foreground">R$ {costResult.totalCost.toFixed(2).replace('.', ',')}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-muted-foreground">Lucro estimado</span>
                           <span className={`font-medium ${marginColor}`}>
                             R$ {costResult.profit.toFixed(2).replace('.', ',')} ({costResult.marginPercent.toFixed(0)}%)
                           </span>
                         </div>
                       </>
                     );
                   })()}
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

              {/* Status History */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Status
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchStatusHistory(selectedOrder.id)}
                    disabled={isLoadingHistory}
                  >
                    {isLoadingHistory ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                
                {statusHistory.length === 0 && !isLoadingHistory && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Clique em atualizar para carregar o histórico
                  </p>
                )}
                
                {isLoadingHistory && (
                  <div className="flex justify-center py-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {statusHistory.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {statusHistory.map((entry) => (
                      <div key={entry.id} className="text-xs border-l-2 border-primary/30 pl-2 py-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-muted-foreground">
                            {entry.previous_status ? getStatusLabel(entry.previous_status) : 'Novo'}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{getStatusLabel(entry.new_status)}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {new Date(entry.created_at).toLocaleString('pt-BR')}
                          {entry.changed_by_name && (
                            <span className="ml-1">• {entry.changed_by_name}</span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-muted-foreground mt-1 italic">"{entry.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {/* Confirm pending orders */}
                {['whatsapp_pending', 'pending', 'awaiting_payment'].includes(selectedOrder.status) && (
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

                {/* Generate PIX button - for pending orders */}
                {['whatsapp_pending', 'pending', 'awaiting_payment'].includes(selectedOrder.status) && (
                  <Button
                    variant="default"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => generatePixForOrder(selectedOrder.id)}
                    disabled={isGeneratingPix === selectedOrder.id}
                  >
                    {isGeneratingPix === selectedOrder.id ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4 mr-2" />
                    )}
                    Gerar PIX
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

                {/* Print button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => printOrderTicket(selectedOrder)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Ficha (A4)
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => printThermalTicket(selectedOrder, flavorSidesMap, 'DIETA JÁ', ingredientDescMap)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  🖨️ Térmica i9 (Cozinha)
                </Button>

                {/* Production ticket buttons - only for marmita orders */}
                {selectedOrder.items.some(i => i.type === 'marmita') && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => printOrderProduction(selectedOrder, flavorSidesMap)}
                    >
                      <ChefHat className="w-4 h-4 mr-2" />
                      🖨️ Produção (Imprimir)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const text = generateOrderProductionWhatsApp(selectedOrder, flavorSidesMap);
                        if (!text) {
                          toast({ title: 'Sem marmitas', description: 'Este pedido não possui marmitas.', variant: 'destructive' });
                          return;
                        }
                        shareViaWhatsApp(text);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      📋 Produção (WhatsApp)
                    </Button>
                  </>
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
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setOrderToCancel(selectedOrder)}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Cancelar Pedido
                  </Button>
                )}
              </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Flavor Composition Modal */}
      {editingFlavorItems && (
        <OrderConfirmationModal
          isOpen={!!editingFlavorItems}
          onClose={() => setEditingFlavorItems(null)}
          onConfirm={() => {
            setEditingFlavorItems(null);
            toast({ title: "Composição atualizada!", description: "Os pesos foram salvos com sucesso." });
          }}
          items={editingFlavorItems}
          lineType={editingLineType}
          customerName={selectedOrder?.customer_name || ''}
          subtotal={selectedOrder?.subtotal || 0}
          deliveryDate=""
          deliveryTime=""
          paymentStatus="paid"
          onItemsUpdated={(flavorId, newSides) => {
            // Update local flavorSidesMap so the detail view refreshes immediately
            const flavorName = Object.entries(flavorIdMap).find(([_, id]) => id === flavorId)?.[0];
            if (flavorName) {
              setFlavorSidesMap(prev => ({ ...prev, [flavorName]: newSides }));
            }
          }}
        />
      )}

      {/* Cancel Order Dialog with Reason */}
      <Dialog 
        open={!!orderToCancel} 
        onOpenChange={(open) => {
          if (!open) {
            setOrderToCancel(null);
            setCancelReason('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Cancelar Pedido #{orderToCancel?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o motivo do cancelamento. Esta informação será registrada no histórico do pedido.
            </p>
            
            <Textarea
              placeholder="Ex: Cliente desistiu da compra, produto indisponível, endereço incorreto..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="min-h-[100px]"
            />
            
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres ({cancelReason.length}/10)
            </p>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setOrderToCancel(null);
                setCancelReason('');
              }}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length < 10 || isUpdatingStatus === orderToCancel?.id}
              onClick={() => orderToCancel && cancelOrder(orderToCancel.id, cancelReason.trim())}
            >
              {isUpdatingStatus === orderToCancel?.id ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIX Result Modal */}
      <Dialog 
        open={showPixModal} 
        onOpenChange={(open) => {
          if (!open) {
            setShowPixModal(false);
            setPixResult(null);
            setCopiedField(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <QrCode className="w-5 h-5" />
              {pixResult?.reused ? 'PIX Recuperado' : 'PIX Gerado'} - R$ {pixResult?.total?.toFixed(2).replace('.', ',')}
            </DialogTitle>
          </DialogHeader>
          
          {pixResult && (
            <div className="space-y-4">
              {/* QR Code */}
              {pixResult.qr_code_base64 && (
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${pixResult.qr_code_base64}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 border rounded-lg"
                  />
                </div>
              )}

              {/* Payment link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Link da página de pagamento:
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 bg-muted rounded-lg text-xs font-mono break-all">
                    {pixResult.pix_link}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(pixResult.pix_link, 'link')}
                    className="shrink-0"
                  >
                    {copiedField === 'link' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <LinkIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* PIX code */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Código PIX (copia e cola):
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 bg-muted rounded-lg text-xs font-mono break-all max-h-20 overflow-y-auto">
                    {pixResult.pix_code}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(pixResult.pix_code, 'code')}
                    className="shrink-0"
                  >
                    {copiedField === 'code' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Notification status */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Notificações:</p>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    {pixResult.whatsapp_sent ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>WhatsApp {pixResult.whatsapp_sent ? 'enviado' : 'não enviado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pixResult.email_sent ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>Email {pixResult.email_sent ? 'enviado' : 'não enviado'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPixModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Link Modal */}
      <Dialog 
        open={trackingModal.show} 
        onOpenChange={(open) => {
          if (!open) {
            setTrackingModal({ orderId: '', show: false });
            setTrackingLink('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Truck className="w-5 h-5" />
              Saiu para Entrega
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole abaixo o link de rastreio do iFood, 99, Uber ou outro serviço de entrega. 
              O cliente receberá automaticamente via WhatsApp e Email.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Link de rastreio (opcional):
              </label>
              <Textarea
                value={trackingLink}
                onChange={(e) => setTrackingLink(e.target.value)}
                placeholder="https://meupedido.ifood.com.br/..."
                className="min-h-[80px] font-mono text-sm"
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleSendToDelivery(false)}
              disabled={isUpdatingStatus === trackingModal.orderId}
              className="w-full sm:w-auto"
            >
              Enviar sem link
            </Button>
            <Button
              onClick={() => handleSendToDelivery(true)}
              disabled={isUpdatingStatus === trackingModal.orderId || !trackingLink.trim()}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
            >
              {isUpdatingStatus === trackingModal.orderId ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LinkIcon className="w-4 h-4 mr-2" />
              )}
              Enviar com link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Approval Prompt Modal */}
      <AlertDialog open={!!paymentPrompt} onOpenChange={(open) => { if (!open) setPaymentPrompt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Aprovar pagamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este pedido ainda não está marcado como pago. Deseja <strong>aprovar o pagamento</strong> antes de mudar o status?
              <br /><br />
              <span className="text-muted-foreground text-xs">
                Aprovar irá registrar como pago, decrementar estoque e enviar confirmação ao cliente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setPaymentPrompt(null)}>Cancelar</AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={handlePaymentPromptSkip}
            >
              Pular (só mudar status)
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePaymentPromptApprove}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Sim, aprovar pagamento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersManager;
