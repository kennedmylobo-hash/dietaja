import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Calendar, AlertCircle } from "lucide-react";

const UrgencySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-20 bg-background">
      <div className="container px-6">
        <motion.div 
          className="max-w-2xl mx-auto space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Local */}
          <div className="flex items-center gap-4 p-5 rounded-xl bg-sage-light/50 border border-primary/20">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Atendemos Vitória da Conquista
              </p>
              <p className="text-sm text-muted-foreground">
                Produção local, entrega organizada e cuidado em cada pedido.
              </p>
            </div>
          </div>

          {/* Urgência */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-terracotta-light/50 border border-terracotta/20">
            <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2">
                Próxima produção: segunda-feira
                <AlertCircle className="w-4 h-4 text-terracotta" />
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Trabalhamos com quantidade limitada para garantir qualidade. 
                Quando atingimos o limite, os pedidos ficam para a próxima entrega.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default UrgencySection;
