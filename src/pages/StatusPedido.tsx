import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  Search, 
  MessageCircle, 
  Smartphone,
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  name: string;
  quantity: number;
}

interface OrderStatus {
  order_number: string;
  status: string;
  customer_first_name: string;
  created_at: string;
  items: OrderItem[];
  total: number;
  delivery_option: string;
  paid_at: string | null;
}

type StatusStep = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
};

const STATUS_STEPS: StatusStep[] = [
  { 
    id: "received", 
    label: "Pedido Recebido", 
    icon: <Package className="w-5 h-5" />,
    description: "Seu pedido foi registrado"
  },
  { 
    id: "payment", 
    label: "Pagamento", 
    icon: <Smartphone className="w-5 h-5" />,
    description: "Aguardando pagamento"
  },
  { 
    id: "preparing", 
    label: "Em Produção", 
    icon: <Clock className="w-5 h-5" />,
    description: "Preparando suas marmitas"
  },
  { 
    id: "ready", 
    label: "Separado", 
    icon: <Package className="w-5 h-5" />,
    description: "Separado para entrega/retirada"
  },
  { 
    id: "delivering", 
    label: "Em Entrega", 
    icon: <Truck className="w-5 h-5" />,
    description: "Seu pedido está a caminho"
  },
  { 
    id: "delivered", 
    label: "Entregue", 
    icon: <CheckCircle2 className="w-5 h-5" />,
    description: "Entregue com sucesso!"
  },
];

const getStepIndex = (status: string): number => {
  switch (status) {
    case "pending":
    case "awaiting_payment":
    case "whatsapp_pending":
      return 1; // Awaiting payment
    case "approved":
      return 2; // Preparing
    case "preparing":
      return 2; // Preparing
    case "ready":
      return 3; // Ready/Separated
    case "delivering":
      return 4; // Delivering
    case "delivered":
    case "completed":
      return 5; // Delivered
    case "rejected":
    case "cancelled":
      return -1; // Error state
    default:
      return 1;
  }
};

const getPaymentStepStatus = (status: string): "completed" | "current" | "pending" => {
  if (["approved", "preparing", "ready", "delivering", "delivered", "completed"].includes(status)) {
    return "completed";
  }
  if (["pending", "awaiting_payment", "whatsapp_pending"].includes(status)) {
    return "current";
  }
  return "pending";
};

const StatusPedido = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(orderNumber || "");

  const fetchOrderStatus = async (num: string) => {
    if (!num.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-order-status", {
        body: null,
        headers: {},
      });

      // Use URL params for GET request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-order-status?order_number=${encodeURIComponent(num)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar pedido");
      }

      setOrder(result);
      
      // Update URL if different
      if (num.toUpperCase() !== orderNumber?.toUpperCase()) {
        navigate(`/pedido/${num.toUpperCase()}`, { replace: true });
      }
    } catch (err: any) {
      console.error("Error fetching order:", err);
      setError(err.message || "Pedido não encontrado");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) {
      fetchOrderStatus(orderNumber);
    }
  }, [orderNumber]);

  // Realtime subscription for status updates
  useEffect(() => {
    if (!order?.order_number) return;

    const channel = supabase
      .channel("order-status-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_number=eq.${order.order_number}`,
        },
        (payload) => {
          console.log("Order updated:", payload);
          setOrder((prev) => prev ? { ...prev, status: payload.new.status, paid_at: payload.new.paid_at } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.order_number]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrderStatus(searchInput);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const currentStepIndex = order ? getStepIndex(order.status) : 0;
  const isPaymentPending = order && ["pending", "awaiting_payment", "whatsapp_pending"].includes(order.status);
  const isRejected = order?.status === "rejected" || order?.status === "cancelled";

  return (
    <>
      <Helmet>
        <title>Acompanhar Pedido | Dieta Já</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background">
        {/* Header */}
        <header className="py-4 px-4 border-b border-border/50">
          <div className="container flex items-center justify-between">
            <Link to="/">
              <Logo />
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Link>
            </Button>
          </div>
        </header>

        <main className="container py-8 px-4 max-w-lg mx-auto">
          {/* Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold text-center text-foreground mb-2">
              Acompanhe seu Pedido
            </h1>
            <p className="text-center text-muted-foreground mb-6">
              Digite o número do pedido para ver o status
            </p>

            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex: DJA-0001"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                className="flex-1 text-center font-mono text-lg"
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </form>
          </motion.div>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center"
            >
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Verifique o número do pedido e tente novamente
              </p>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && !order && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Buscando pedido...</p>
            </div>
          )}

          {/* Order Status */}
          {order && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Order Header */}
              <div className="bg-card rounded-xl p-6 border border-border shadow-soft text-center">
                <p className="text-sm text-muted-foreground">Pedido</p>
                <p className="text-2xl font-bold text-primary mb-2">
                  #{order.order_number}
                </p>
                <p className="text-foreground">
                  Olá, <span className="font-semibold">{order.customer_first_name}</span>!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Realizado em {formatDate(order.created_at)}
                </p>
              </div>

              {/* Rejected/Cancelled State */}
              {isRejected && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-destructive mb-1">
                    {order.status === "rejected" ? "Pagamento Recusado" : "Pedido Cancelado"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Entre em contato pelo WhatsApp para mais informações
                  </p>
                </div>
              )}

              {/* Status Timeline */}
              {!isRejected && (
                <div className="bg-card rounded-xl p-6 border border-border shadow-soft">
                  <h3 className="font-semibold text-foreground mb-6">Status do Pedido</h3>
                  
                  <div className="relative">
                    {STATUS_STEPS.map((step, index) => {
                      let stepStatus: "completed" | "current" | "pending" = "pending";
                      
                      if (index === 0) {
                        stepStatus = "completed"; // Always completed
                      } else if (index === 1) {
                        stepStatus = getPaymentStepStatus(order.status);
                      } else if (index < currentStepIndex) {
                        stepStatus = "completed";
                      } else if (index === currentStepIndex) {
                        stepStatus = "current";
                      }

                      const isCompleted = stepStatus === "completed";
                      const isCurrent = stepStatus === "current";

                      return (
                        <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                isCompleted
                                  ? "bg-primary text-primary-foreground"
                                  : isCurrent
                                  ? "bg-amber-100 text-amber-600 border-2 border-amber-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                step.icon
                              )}
                            </div>
                            {index < STATUS_STEPS.length - 1 && (
                              <div
                                className={`w-0.5 flex-1 mt-2 ${
                                  isCompleted ? "bg-primary" : "bg-muted"
                                }`}
                              />
                            )}
                          </div>

                          {/* Step content */}
                          <div className="flex-1 pb-2">
                            <p
                              className={`font-medium ${
                                isCompleted || isCurrent
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {step.id === "payment" && isCompleted
                                ? "Pagamento Confirmado"
                                : step.id === "payment" && isCurrent
                                ? "Aguardando Pagamento"
                                : step.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {step.id === "payment" && isCompleted && order.paid_at
                                ? `Confirmado em ${formatDate(order.paid_at)}`
                                : step.description}
                            </p>
                            {isCurrent && (
                              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                Status atual
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-card rounded-xl p-6 border border-border shadow-soft">
                <h3 className="font-semibold text-foreground mb-4">Resumo do Pedido</h3>
                
                <div className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>

                <div className="mt-3 text-sm text-muted-foreground">
                  📍 {order.delivery_option === "pickup" ? "Retirada no local" : "Entrega"}
                </div>
              </div>

              {/* Payment Actions (if pending) */}
              {isPaymentPending && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-amber-800 font-medium">
                      ⏳ Complete o pagamento para confirmar seu pedido
                    </p>
                  </div>

                  <Button variant="cta" size="lg" className="w-full" asChild>
                    <a
                      href={`https://wa.me/5577991001658?text=Olá! Quero pagar o pedido ${order.order_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Smartphone className="w-5 h-5" />
                      Pagar via PIX
                    </a>
                  </Button>

                  <Button variant="outline" size="lg" className="w-full" asChild>
                    <a
                      href={`https://wa.me/5577991001658?text=Olá! Gostaria de informações sobre o pedido ${order.order_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Falar no WhatsApp
                    </a>
                  </Button>
                </div>
              )}

              {/* Contact for non-pending */}
              {!isPaymentPending && !isRejected && (
                <Button variant="outline" size="lg" className="w-full" asChild>
                  <a
                    href={`https://wa.me/5577991001658?text=Olá! Gostaria de informações sobre o pedido ${order.order_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Falar no WhatsApp
                  </a>
                </Button>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
};

export default StatusPedido;
