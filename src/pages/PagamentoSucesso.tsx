import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Home, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

interface OrderData {
  id: string;
  customer_name: string;
  items: Array<{ name: string; quantity: number; totalPrice: number }>;
  total: number;
  delivery_option: string;
  status: string;
}

const PagamentoSucesso = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const status = searchParams.get("status");
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    // Track Purchase event
    if (typeof window !== 'undefined' && window.fbq && orderId) {
      window.fbq('track', 'Purchase', {
        value: order?.total || 0,
        currency: 'BRL',
        content_type: 'product',
        order_id: orderId,
      });
    }
  }, [orderId, order?.total]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      // We can't fetch with RLS since user isn't logged in
      // Just show confirmation with order ID
      setOrder({
        id: orderId,
        customer_name: '',
        items: [],
        total: 0,
        delivery_option: '',
        status: status || 'approved',
      });
    };

    fetchOrder();
  }, [orderId, status]);

  const isPending = status === 'pending';

  return (
    <>
      <Helmet>
        <title>Pagamento Confirmado | Dieta Já</title>
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
              <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
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
              <ul className="text-sm text-muted-foreground text-left space-y-1">
                <li>• Você receberá uma confirmação por email</li>
                <li>• Entrega/retirada na próxima quarta-feira</li>
                <li>• Dúvidas? Entre em contato pelo WhatsApp</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild variant="cta" size="lg" className="w-full">
                <a
                  href="https://wa.me/5577991001658?text=Olá! Acabei de fazer um pedido online e gostaria de confirmar."
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
