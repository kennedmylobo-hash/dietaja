import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Home, MessageCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";

interface OrderData {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: Array<{ name: string; quantity: number; totalPrice: number }>;
  total: number;
  delivery_option: string;
  status: string;
}

const PagamentoSucesso = () => {
  const { brand, getWhatsAppLink } = useTenantConfig();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const urlStatus = searchParams.get("status");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [realStatus, setRealStatus] = useState<string | null>(null);

  // Verificar status real do pagamento via Edge Function
  useEffect(() => {
    const checkRealStatus = async () => {
      if (!orderId) {
        setLoading(false);
        setRealStatus(urlStatus || 'approved');
        return;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('check-payment-status', {
          body: { order_id: orderId }
        });
        
        if (!error && data) {
          setRealStatus(data.status);
          setOrder({
            id: orderId,
            customer_name: data.customer_name || '',
            customer_email: data.customer_email || '',
            customer_phone: data.customer_phone || '',
            items: data.items || [],
            total: data.total || 0,
            delivery_option: data.delivery_option || '',
            status: data.status,
          });
        } else {
          // Fallback para parâmetro da URL
          setRealStatus(urlStatus || 'approved');
          setOrder({
            id: orderId,
            customer_name: '',
            customer_email: '',
            customer_phone: '',
            items: [],
            total: 0,
            delivery_option: '',
            status: urlStatus || 'approved',
          });
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        setRealStatus(urlStatus || 'approved');
      } finally {
        setLoading(false);
      }
    };
    
    checkRealStatus();
  }, [orderId, urlStatus]);

  // Polling automático enquanto status for pending
  useEffect(() => {
    if (realStatus !== 'pending' || !orderId) return;
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-payment-status', {
          body: { order_id: orderId }
        });
        
        if (!error && data && ['approved', 'paid'].includes(data.status)) {
          setRealStatus('approved');
          setOrder(prev => prev ? { ...prev, status: 'approved', total: data.total || prev.total, customer_email: data.customer_email || prev.customer_email, customer_phone: data.customer_phone || prev.customer_phone } : null);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 5000); // Poll a cada 5 segundos
    
    return () => clearInterval(interval);
  }, [realStatus, orderId]);

  const tenantId = useTenantId();

  // Track Purchase event - Meta Pixel (browser) + CAPI (server) + GA4
  useEffect(() => {
    if (realStatus !== 'approved' || !orderId) return;
    
    // Use deterministic event_id so browser + webhook deduplicate correctly
    const eventId = `purchase_${orderId}`;
    
    // Unified tracker: browser Pixel + CAPI with fbp/fbc/userAgent signals
    trackMetaEvent({
      eventName: 'Purchase',
      eventId,
      tenantId,
      customerEmail: order?.customer_email || null,
      customerPhone: order?.customer_phone || null,
      params: {
        value: order?.total || 0,
        currency: 'BRL',
        content_type: 'product',
        order_id: orderId,
      },
    });
    
    // Track Purchase event - GA4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        currency: 'BRL',
        value: order?.total || 0,
        items: order?.items?.map((item, index) => ({
          item_name: item.name,
          price: item.totalPrice / item.quantity,
          quantity: item.quantity,
          index: index,
        })) || []
      });
    }
  }, [realStatus, orderId, order?.total, order?.items, tenantId]);

  const isPending = realStatus === 'pending';

  // Loading state
  if (loading) {
    return (
      <>
        <Helmet>
          <title>Verificando Pagamento | {brand.name}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando pagamento...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pagamento Confirmado | {brand.name}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background flex flex-col">
        {/* Header */}
        <header className="py-4 px-4">
          <div className="container">
            <Link to="/">
              <Logo />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            className="max-w-md w-full bg-card rounded-2xl p-8 shadow-soft border border-border text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              {isPending ? (
                <Clock className="w-20 h-20 text-amber-500 mx-auto mb-6" />
              ) : (
                <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
              )}
            </motion.div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isPending ? "Pagamento em processamento!" : "Pagamento confirmado!"}
            </h1>

            <p className="text-muted-foreground mb-6">
              {isPending
                ? "Seu pagamento está sendo processado. Você receberá uma confirmação em breve."
                : "Obrigado pela sua compra! Seu pedido foi recebido com sucesso."}
            </p>

            {orderId && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">Número do pedido</p>
                <p className="font-mono text-sm font-medium text-foreground break-all">
                  {orderId}
                </p>
              </div>
            )}

            <div className="bg-sage-light/30 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-foreground mb-2">📅 Próximos passos</p>
              <ul className="text-sm text-muted-foreground text-left space-y-2">
                <li>✅ Pagamento confirmado com sucesso</li>
                <li>🍽️ Seu pedido ficará pronto em até <strong className="text-foreground">72 horas úteis</strong></li>
                <li>📲 Assim que estiver pronto, entraremos em contato — podendo ficar pronto antes!</li>
                <li>💬 Dúvidas? Fale conosco pelo WhatsApp</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild variant="cta" size="lg" className="w-full">
                <a
                  href={getWhatsAppLink("Olá! Acabei de fazer um pedido online e gostaria de confirmar.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar no WhatsApp
                </a>
              </Button>

              <Button asChild variant="outline" size="lg" className="w-full">
                <Link to="/">
                  <Home className="w-5 h-5" />
                  Voltar ao início
                </Link>
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default PagamentoSucesso;
