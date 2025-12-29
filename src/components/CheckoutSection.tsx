import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Smartphone, MessageCircle, Check, Sparkles } from "lucide-react";
import type { Kit } from "./KitsSection";

interface CheckoutSectionProps {
  selectedKit: Kit | null;
  onWhatsAppClick: (withMarmitas: boolean) => void;
}

const CheckoutSection = ({ selectedKit, onWhatsAppClick }: CheckoutSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [addMarmitas, setAddMarmitas] = useState(false);

  const kitName = selectedKit?.name || "Kit Detox 5 Dias";
  const kitPrice = selectedKit?.price || 299;
  const marmitasPrice = 400;
  const marmitasOriginal = 500;

  const total = kitPrice + (addMarmitas ? marmitasPrice : 0);

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
            <h3 className="text-lg font-bold text-foreground mb-4">Resumo do pedido</h3>
            
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-foreground">{kitName}</span>
              <span className="font-semibold text-foreground">R$ {kitPrice}</span>
            </div>

            {/* Order Bump */}
            <div className="my-4 p-4 rounded-xl bg-terracotta-light/50 border-2 border-dashed border-terracotta/30">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="marmitas" 
                  checked={addMarmitas}
                  onCheckedChange={(checked) => setAddMarmitas(checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="marmitas" className="cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-terracotta" />
                      <span className="font-semibold text-foreground text-sm">
                        Continuidade do cuidado
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2">
                      Adicionar 20 marmitas saudáveis prontas
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Para manter os resultados após o detox
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-through text-muted-foreground">
                        R$ {marmitasOriginal}
                      </span>
                      <span className="text-sm font-bold text-terracotta">
                        R$ {marmitasPrice}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-terracotta/20 text-terracotta rounded-full font-medium">
                        Economize R$100
                      </span>
                    </div>
                    <p className="text-xs text-terracotta/80 mt-1 font-medium">
                      Disponível somente agora
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-t border-border">
              <span className="font-bold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">R$ {total}</span>
            </div>
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
              onClick={() => onWhatsAppClick(addMarmitas)}
            >
              <MessageCircle className="w-5 h-5" />
              Quero cuidar da minha alimentação agora
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CheckoutSection;
