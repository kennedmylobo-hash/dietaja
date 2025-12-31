import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Clock, AlertCircle } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";

const UrgencySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Simula vagas restantes (baseado na hora do dia)
  const getVagasRestantes = () => {
    const hour = new Date().getHours();
    // Mais vagas de manhã, menos à noite
    if (hour < 10) return 12;
    if (hour < 14) return 8;
    if (hour < 18) return 5;
    return 3;
  };

  const vagasRestantes = getVagasRestantes();

  return (
    <section ref={ref} className="py-16 md:py-20 bg-background">
      <div className="container px-6">
        <motion.div 
          className="max-w-2xl mx-auto space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Contador de vagas */}
          <div className="text-center p-6 rounded-xl bg-terracotta/10 border-2 border-terracotta/30">
            <p className="text-lg font-bold text-terracotta mb-1">
              🔥 Restam apenas {vagasRestantes} vagas para esta semana
            </p>
            <p className="text-sm text-muted-foreground">
              Pedidos feitos até domingo = Entrega na quarta-feira
            </p>
          </div>

          {/* Local */}
          <div className="flex items-center gap-4 p-5 rounded-xl bg-sage-light/50 border border-primary/20">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Vitória da Conquista
              </p>
              <p className="text-sm text-muted-foreground">
                📍 Retirada grátis no Recreio • 🛵 Entrega R$ 10
              </p>
            </div>
          </div>

          {/* Urgência com Countdown */}
          <div className="flex flex-col p-6 rounded-xl bg-terracotta-light/50 border border-terracotta/20">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-terracotta" />
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  Produção limitada!
                  <AlertCircle className="w-4 h-4 text-terracotta" />
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Trabalhamos com quantidade limitada para garantir qualidade e frescor.
                </p>
              </div>
            </div>
            
            <div className="bg-card/50 rounded-lg p-4 flex flex-col items-center">
              <span className="text-sm text-muted-foreground mb-2">Pedidos encerram domingo • Entrega na quarta:</span>
              <CountdownTimer />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default UrgencySection;
