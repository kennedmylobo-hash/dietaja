import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Smartphone, MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";

interface CheckoutSectionProps {
  onWhatsAppClick: () => void;
}

const CheckoutSection = ({ onWhatsAppClick }: CheckoutSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { items, getTotal } = useCart();

  const total = getTotal();
  const hasItems = items.length > 0;

  return (
    <section ref={ref} id="checkout" className="py-20 md:py-28 bg-card">
      <div className="container px-6">
        <motion.div
          className="max-w-lg mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Order summary */}
          <div className="bg-background rounded-2xl p-6 md:p-8 shadow-soft border border-border mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Resumo do pedido
            </h3>

            {!hasItems ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Seu carrinho está vazio</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha um kit detox ou marmitas acima para começar
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

          {/* Payment methods */}
          <div className="bg-background rounded-2xl p-6 shadow-soft border border-border mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Formas de pagamento
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-sage-light/30">
                <Smartphone className="w-5 h-5 text-primary" />
                <div>
                  <span className="font-medium text-foreground">Pix</span>
                  <span className="text-sm text-muted-foreground ml-2">valores à vista</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Cartão de crédito</span>
                  <p className="text-sm text-muted-foreground">
                    parcelamos, com taxa do cartão por conta do cliente
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4 text-center">
              Pagamento via link seguro, enviado pelo WhatsApp
            </p>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Para manter o cuidado em cada pedido, a finalização é feita pelo WhatsApp.
            </p>

            <Button
              variant="cta"
              size="xl"
              className="w-full group"
              onClick={onWhatsAppClick}
              disabled={!hasItems}
            >
              <MessageCircle className="w-5 h-5" />
              {hasItems
                ? "Quero cuidar da minha alimentação agora"
                : "Adicione produtos ao carrinho"}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CheckoutSection;
