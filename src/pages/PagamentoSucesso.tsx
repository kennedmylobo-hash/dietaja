import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Home, MessageCircle, Loader2, Clock, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";
import { useMarmitaFlavors } from "@/hooks/useMenuData";
import { useCart } from "@/components/CartContext";

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
  const { clearCart } = useCart();

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

  // Zerar carrinho quando pagamento for aprovado (PIX ou cartao)
  useEffect(() => {
    if (realStatus === 'approved' || realStatus === 'paid') {
      clearCart();
    }
  }, [realStatus, clearCart]);

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
  const isApproved = realStatus === 'approved' || realStatus === 'paid';

  // === Escolha de sabores pós-pagamento (Kit Primeiro Pedido) ===
  const isPrimeiroPedido = useMemo(
    () => (order?.items || []).some((i: any) => i?.type === 'kit-primeiro-pedido' || /primeiro pedido/i.test(i?.name || '')),
    [order?.items]
  );
  const { data: flavors = [] } = useMarmitaFlavors();
  const KIT_SIZE = 10;
  const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
    carnes: { label: "Carnes", emoji: "🥩" },
    frangos: { label: "Frangos", emoji: "🍗" },
    massas: { label: "Massas", emoji: "🍝" },
    especiais: { label: "Especiais", emoji: "✨" },
  };
  const [flavorSelections, setFlavorSelections] = useState<Record<string, number>>({});
  const [leaveToUs, setLeaveToUs] = useState(false);
  const [flavorsSent, setFlavorsSent] = useState(false);
  const totalSelected = Object.values(flavorSelections).reduce((a, b) => a + b, 0);
  const groupedFlavors = flavors.reduce<Record<string, typeof flavors>>((acc, f) => {
    (acc[f.category] = acc[f.category] || []).push(f);
    return acc;
  }, {});
  const adjustFlavor = (name: string, delta: number) => {
    setFlavorSelections((prev) => {
      const current = prev[name] || 0;
      const next = Math.max(0, current + delta);
      const otherTotal = Object.entries(prev).reduce(
        (s, [k, v]) => (k === name ? s : s + v),
        0,
      );
      if (otherTotal + next > KIT_SIZE) return prev;
      return { ...prev, [name]: next };
    });
    if (leaveToUs) setLeaveToUs(false);
  };
  const canSendFlavors = leaveToUs || totalSelected === KIT_SIZE;
  const sendFlavorsWhatsApp = () => {
    const orderRef = orderId ? `#${orderId.slice(0, 8)}` : '';
    let body = `Olá! Acabei de pagar o Kit Primeiro Pedido ${orderRef} e quero registrar meus 10 sabores:\n\n`;
    if (leaveToUs) {
      body += `✨ Pode deixar por conta da cozinha — quero o sortido dos mais pedidos!`;
    } else {
      const picks = Object.entries(flavorSelections)
        .filter(([, q]) => q > 0)
        .map(([n, q]) => `• ${q}x ${n}`)
        .join("\n");
      body += picks;
    }
    window.open(getWhatsAppLink(body), "_blank");
    setFlavorsSent(true);
  };

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
              {isPending ? "Pagamento em processamento!" : "Pedido confirmado! 🎉"}
            </h1>

            <p className="text-muted-foreground mb-6">
              {isPending
                ? "Seu pagamento está sendo processado. Você receberá uma confirmação em breve."
                : "Obrigado pela confiança! Seu kit de 10 marmitas já está separado para produção."}
            </p>

            {orderId && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">Número do pedido</p>
                <p className="font-mono text-sm font-medium text-foreground break-all">
                  {orderId}
                </p>
              </div>
            )}

            {/* ===== Escolher sabores (somente Kit Primeiro Pedido aprovado) ===== */}
            {isApproved && isPrimeiroPedido && !flavorsSent && (
              <div className="bg-card border-2 border-dashed border-primary/40 rounded-2xl p-4 mb-5 text-left space-y-3">
                <div className="text-center space-y-0.5">
                  <p className="text-base font-extrabold text-foreground">
                    🍽️ Agora escolha seus <span className="text-primary">10 sabores</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione os sabores do seu kit. Pode repetir!
                  </p>
                </div>

                <div
                  className={`rounded-lg px-3 py-2 text-center text-xs font-bold ${
                    leaveToUs || totalSelected === KIT_SIZE
                      ? "bg-success/10 text-success"
                      : totalSelected > KIT_SIZE
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {leaveToUs
                    ? "✨ Sortido — por conta da cozinha"
                    : totalSelected === KIT_SIZE
                    ? `✓ ${totalSelected}/${KIT_SIZE} sabores escolhidos`
                    : `${totalSelected}/${KIT_SIZE} sabores — faltam ${Math.max(0, KIT_SIZE - totalSelected)}`}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLeaveToUs((v) => !v);
                    if (!leaveToUs) setFlavorSelections({});
                  }}
                  className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                    leaveToUs
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        leaveToUs ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {leaveToUs && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                    </div>
                    <div>
                      <p className={`text-[12px] font-bold ${leaveToUs ? "text-primary" : "text-foreground"}`}>
                        ✨ Deixar por conta da cozinha
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Seleção variada com os mais pedidos
                      </p>
                    </div>
                  </div>
                </button>

                {!leaveToUs &&
                  Object.entries(groupedFlavors).map(([category, items]) => {
                    const meta = CATEGORY_LABELS[category] || { label: category, emoji: "🍱" };
                    return (
                      <div key={category} className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          {meta.emoji} {meta.label}
                        </p>
                        <div className="space-y-1.5">
                          {items.map((f) => {
                            const qty = flavorSelections[f.name] || 0;
                            const canAdd = totalSelected < KIT_SIZE;
                            return (
                              <div
                                key={f.id}
                                className={`flex items-center justify-between gap-2 rounded-lg border-2 p-2 transition-all ${
                                  qty > 0 ? "border-primary bg-primary/5" : "border-border bg-background"
                                }`}
                              >
                                <p className="text-[12px] font-medium text-foreground flex-1 leading-tight">
                                  {f.name}
                                </p>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => adjustFlavor(f.name, -1)}
                                    disabled={qty === 0}
                                    className="w-7 h-7 rounded-full border-2 border-border flex items-center justify-center disabled:opacity-30 hover:border-primary"
                                    aria-label={`Remover ${f.name}`}
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-bold tabular-nums">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => adjustFlavor(f.name, +1)}
                                    disabled={!canAdd}
                                    className="w-7 h-7 rounded-full border-2 border-primary bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30"
                                    aria-label={`Adicionar ${f.name}`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                <Button
                  variant="cta"
                  size="lg"
                  className="w-full"
                  disabled={!canSendFlavors}
                  onClick={sendFlavorsWhatsApp}
                >
                  <MessageCircle className="w-5 h-5" />
                  Enviar sabores no WhatsApp
                </Button>
              </div>
            )}

            {isApproved && isPrimeiroPedido && flavorsSent && (
              <div className="bg-success/10 border-2 border-success/30 rounded-xl p-4 mb-5 text-left">
                <p className="text-sm font-bold text-success flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Sabores enviados!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recebemos sua escolha. Em breve confirmaremos no WhatsApp. 💚
                </p>
              </div>
            )}

            {/* 🎉 Parabéns + entrega */}
            <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-5 mb-5">
              <p className="text-lg font-extrabold text-foreground mb-1">
                🎉 Parabéns pela sua escolha!
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seu pedido foi confirmado com sucesso. <strong className="text-foreground">A entrega será em até 3 dias úteis</strong> — levamos esse tempo para preparar tudo com muito cuidado e carinho!
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-5">
              <p className="text-sm font-medium text-foreground mb-2">📅 O que acontece agora?</p>
              <ul className="text-sm text-muted-foreground text-left space-y-2">
                <li className="flex gap-2"><span>🍳</span> Nossa equipe prepara suas marmitas com ingredientes frescos</li>
                <li className="flex gap-2"><span>🚚</span> Entrega em até <strong className="text-foreground">3 dias úteis</strong></li>
                <li className="flex gap-2"><span>📲</span> Assim que sair pra entrega, você recebe notificação no WhatsApp</li>
                <li className="flex gap-2"><span>❄️</span> Chega congelada, pronta pra guardar no freezer!</li>
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
