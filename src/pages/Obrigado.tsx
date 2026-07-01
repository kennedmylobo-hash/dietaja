import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { CheckCircle, MessageCircle, MapPin, CreditCard, Truck } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { celebrateCheckout } from "@/lib/confetti";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";

const Obrigado = () => {
  const { brand, contact, urls } = useTenantConfig();
  const tenantId = useTenantId();
  const params = new URLSearchParams(window.location.search);
  const total = parseFloat(params.get("total") || "0");
  const itemsCount = parseInt(params.get("items") || "0");

  // Calcular próxima quarta-feira
  const getNextWednesday = (): Date => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    let daysUntilWednesday: number;

    if (dayOfWeek <= 3) {
      daysUntilWednesday = 3 - dayOfWeek;
      if (daysUntilWednesday === 0) daysUntilWednesday = 7;
    } else {
      daysUntilWednesday = 10 - dayOfWeek;
    }

    const nextWednesday = new Date(now);
    nextWednesday.setDate(now.getDate() + daysUntilWednesday);
    return nextWednesday;
  };

  const deliveryDate = getNextWednesday();
  const formattedDate = deliveryDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  // Disparar evento Purchase no Meta Pixel + CAPI + confetti
  useEffect(() => {
    celebrateCheckout();

    if (total > 0) {
      const eventId = generateMetaEventId("whatsapp_purchase");
      trackMetaEvent({
        eventName: "Purchase",
        eventId,
        params: {
          value: total,
          currency: "BRL",
          num_items: itemsCount,
          content_name: "WhatsApp Order",
        },
        tenantId,
      });
    }
  }, [total, itemsCount, tenantId]);

  const steps = [
    {
      icon: MessageCircle,
      title: "Responda no WhatsApp",
      description: "Em instantes você receberá nossa mensagem",
    },
    {
      icon: MapPin,
      title: "Confirme o endereço",
      description: "Informe se prefere entrega ou retirada",
    },
    {
      icon: CreditCard,
      title: "Pagamento",
      description: "Enviaremos o link para pagamento seguro",
    },
    {
      icon: Truck,
      title: "Receba seu pedido",
      description: "Entrega fresquinha na quarta-feira",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Pedido confirmado - {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={urls.canonical} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container px-6 py-4">
            <Logo />
          </div>
        </header>

        {/* Main Content */}
        <main className="container px-6 py-12 max-w-2xl mx-auto">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-14 h-14 text-primary" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Pedido confirmado
            </h1>
            <p className="text-muted-foreground">
              Em instantes recebe a confirmação no WhatsApp
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Guarde este pedido e acompanhe as atualizações por aqui quando precisar.
            </p>
          </motion.div>

          {/* Order Summary Card */}
          {total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-2xl p-6 mb-8"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Resumo
              </h2>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">
                  {itemsCount} {itemsCount === 1 ? "item" : "itens"}
                </span>
                <span className="text-xl font-bold text-primary">
                  R$ {total.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="text-muted-foreground">Entrega prevista</span>
                <span className="font-medium text-foreground capitalize">
                  {formattedDate}
                </span>
              </div>
            </motion.div>
          )}

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-10"
          >
            <h2 className="text-lg font-semibold text-foreground mb-6 text-center">
              O que acontece agora
            </h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-card/50 rounded-xl border border-border/50"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-10"
          >
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="text-foreground font-semibold">Pagamento:</span> {contact.whatsapp ? "pagamento na entrega" : "conforme combinado"}.
              </p>
              <p>
                <span className="text-foreground font-semibold">Atendimento:</span> {brand.name} atende exclusivamente em Vitória da Conquista.
              </p>
              <p>
                <span className="text-foreground font-semibold">Dúvidas:</span> pode retornar pelo mesmo WhatsApp para ajustar endereço ou horário.
              </p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center space-y-3"
          >
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="w-full max-w-xs gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,38%)] text-white">
                <MessageCircle className="w-5 h-5" />
                Abrir WhatsApp
              </Button>
            </a>
            <Link to="/">
              <Button variant="outline" size="lg" className="w-full max-w-xs mt-3">
                Voltar ao cardápio
              </Button>
            </Link>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default Obrigado;
