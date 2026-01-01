import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Smartphone, MessageCircle, ShoppingBag, HelpCircle } from "lucide-react";
import { useCart } from "./CartContext";
import SalesQuizModal from "./SalesQuizModal";

interface CheckoutSectionProps {
  onWhatsAppClick: () => void;
}

const CheckoutSection = ({ onWhatsAppClick }: CheckoutSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { items, getTotal } = useCart();
  const [quizOpen, setQuizOpen] = useState(false);

  const total = getTotal();
  const hasItems = items.length > 0;

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

                <div className="flex justify-between items-center py-4">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {total.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Delivery options */}
          <div className="bg-background rounded-2xl p-4 sm:p-6 shadow-soft border border-border mb-4 sm:mb-6">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 sm:mb-4">
              Entrega ou retirada
            </h3>

            {/* Delivery date prediction */}
            {(() => {
              const getNextWednesday = (): Date => {
                const now = new Date();
                const dayOfWeek = now.getDay(); // 0 = domingo, 3 = quarta
                
                // Pedidos até domingo (0) = entrega quarta (3 dias)
                // Segunda a quarta = próxima quarta (7 a 10 dias)
                // Quinta a sábado = próxima quarta (6 a 4 dias)
                let daysUntilWednesday: number;
                
                if (dayOfWeek === 0) {
                  daysUntilWednesday = 3; // Domingo -> Quarta
                } else if (dayOfWeek <= 3) {
                  daysUntilWednesday = 10 - dayOfWeek; // Seg=9, Ter=8, Qua=7
                } else {
                  daysUntilWednesday = 10 - dayOfWeek; // Qui=6, Sex=5, Sab=4
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
                <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 mb-3 sm:mb-4">
                  <span className="text-base sm:text-lg">📅</span>
                  <div>
                    <span className="font-medium text-foreground text-sm sm:text-base">Previsão de entrega</span>
                    <p className="text-xs sm:text-sm text-primary font-semibold">{formattedDate}</p>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-sage-light/30">
                <span className="text-base sm:text-lg">📍</span>
                <div>
                  <span className="font-medium text-foreground text-sm sm:text-base">Retirada grátis</span>
                  <p className="text-xs sm:text-sm text-muted-foreground">Bairro Recreio</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                <span className="text-base sm:text-lg">🛵</span>
                <div>
                  <span className="font-medium text-foreground text-sm sm:text-base">Entrega</span>
                  <span className="text-xs sm:text-sm text-muted-foreground ml-2">+ R$ 10,00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div className="bg-background rounded-2xl p-4 sm:p-6 shadow-soft border border-border mb-4 sm:mb-6">
            <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 sm:mb-4">
              Formas de pagamento
            </h3>

            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-sage-light/30">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <div>
                  <span className="font-medium text-foreground text-sm sm:text-base">Pix</span>
                  <span className="text-xs sm:text-sm text-muted-foreground ml-2">valores à vista</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium text-foreground text-sm sm:text-base">Cartão de crédito</span>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    parcelamos, com taxa do cartão por conta do cliente
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4 text-center">
              Pagamento via link seguro, enviado pelo WhatsApp
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Para manter o cuidado em cada pedido, a finalização é feita pelo WhatsApp.
            </p>

            <div className="flex flex-col gap-2.5 sm:gap-3">
              <Button
                variant="cta"
                size="xl"
                className="w-full group text-sm sm:text-base px-4 sm:px-6"
                onClick={onWhatsAppClick}
                disabled={!hasItems}
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                {hasItems
                  ? <><span className="hidden sm:inline">Quero cuidar da minha alimentação agora</span><span className="sm:hidden">Finalizar pedido</span></>
                  : "Adicione produtos ao carrinho"}
              </Button>

              <button
                onClick={() => setQuizOpen(true)}
                className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm py-2"
              >
                <HelpCircle className="w-4 h-4" />
                Preciso de ajuda para escolher
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <SalesQuizModal open={quizOpen} onOpenChange={setQuizOpen} />
    </section>
  );
};

export default CheckoutSection;
