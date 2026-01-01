import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ShoppingBag, HelpCircle } from "lucide-react";
import { useCart } from "./CartContext";
import SalesQuizModal from "./SalesQuizModal";
import CheckoutForm from "./CheckoutForm";

interface CheckoutSectionProps {
  onWhatsAppClick: (customerData: { name: string; phone: string; deliveryOption: string; address?: string }) => void;
}

const CheckoutSection = ({ onWhatsAppClick }: CheckoutSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { items, getTotal } = useCart();
  const [quizOpen, setQuizOpen] = useState(false);

  const total = getTotal();
  const hasItems = items.length > 0;

  // Calculate next Wednesday for delivery
  const getNextWednesday = (): Date => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    let daysUntilWednesday: number;
    
    if (dayOfWeek === 0) {
      daysUntilWednesday = 3;
    } else if (dayOfWeek <= 3) {
      daysUntilWednesday = 10 - dayOfWeek;
    } else {
      daysUntilWednesday = 10 - dayOfWeek;
    }
    
    const nextWednesday = new Date(now);
    nextWednesday.setDate(now.getDate() + daysUntilWednesday);
    return nextWednesday;
  };

  const nextWednesday = getNextWednesday();
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const formattedDate = `Quarta, ${nextWednesday.getDate().toString().padStart(2, '0')} de ${months[nextWednesday.getMonth()]}`;

  return (
    <section ref={ref} id="checkout" className="py-12 md:py-20 lg:py-28 bg-card">
      <div className="container px-4 md:px-6">
        <motion.div
          className="max-w-lg mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Order summary */}
          <div className="bg-background rounded-2xl p-4 sm:p-6 md:p-8 shadow-soft border border-border mb-4 sm:mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Resumo do pedido
            </h3>

            {!hasItems ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Seu carrinho está vazio</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha um kit detox (sucos e sopas) ou marmitas congeladas acima
                </p>
              </div>
            ) : (
              <>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start py-3 border-b border-border"
                  >
                    <div>
                      <span className="text-xs uppercase tracking-wide text-primary font-medium">
                        {item.type === "kit" ? "Kit Detox" : "Marmitas"}
                      </span>
                      <p className="text-foreground font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <span className="font-semibold text-foreground">
                      R$ {item.totalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}

                {/* Delivery prediction */}
                <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 mt-4">
                  <span className="text-base sm:text-lg">📅</span>
                  <div>
                    <span className="font-medium text-foreground text-sm sm:text-base">Previsão de entrega</span>
                    <p className="text-xs sm:text-sm text-primary font-semibold">{formattedDate}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Checkout Form */}
          {hasItems && (
            <div className="bg-background rounded-2xl p-4 sm:p-6 md:p-8 shadow-soft border border-border mb-4 sm:mb-6">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Seus dados
              </h3>
              <CheckoutForm onWhatsAppClick={onWhatsAppClick} />
            </div>
          )}

          {/* Help button */}
          <div className="text-center">
            <button
              onClick={() => setQuizOpen(true)}
              className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm py-2 mx-auto"
            >
              <HelpCircle className="w-4 h-4" />
              Preciso de ajuda para escolher
            </button>
          </div>
        </motion.div>
      </div>

      <SalesQuizModal open={quizOpen} onOpenChange={setQuizOpen} />
    </section>
  );
};

export default CheckoutSection;
