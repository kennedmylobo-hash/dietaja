import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, CheckCircle2, Clock } from "lucide-react";
import produtosVideo from "@/assets/produtos-detox-video.mp4";
import CountdownTimer from "@/components/CountdownTimer";

interface HeroSectionProps {
  onCtaClick: () => void;
}

const HeroSection = ({ onCtaClick }: HeroSectionProps) => {
  const [shouldShake, setShouldShake] = useState(false);

  // Trigger shake animation periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }, 4000);

    // Initial shake after 2 seconds
    const initialTimeout = setTimeout(() => {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background video with overlay */}
      <div className="absolute inset-0 -z-10">
        <video
          src={produtosVideo}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-sage-light/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-terracotta-light/20 rounded-full blur-3xl -z-10" />

      <div className="container px-6 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          {/* Badge de urgência */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-terracotta/90 backdrop-blur-sm border border-terracotta shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-semibold text-white">
              🔥 Últimas vagas para entrega desta semana
            </span>
          </motion.div>

          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mt-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Coma melhor mesmo sem tempo —{" "}
            <span className="text-primary">e sinta seu corpo responder.</span>
          </motion.h1>

          <motion.p 
            className="text-lg md:text-xl text-white/90 mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Alimentação saudável pronta para mulheres com rotina corrida em{" "}
            <strong className="text-white">Vitória da Conquista</strong>.
          </motion.p>

          {/* Preço âncora */}
          <motion.p 
            className="text-lg md:text-xl text-white/80 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            Kits a partir de <span className="text-primary font-bold">R$ 199</span> • Marmitas <span className="text-primary font-bold">R$ 12,10</span>/un
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <Button 
              variant="cta" 
              size="xl"
              onClick={onCtaClick}
              className={`group shadow-xl ${shouldShake ? "animate-shake" : ""}`}
            >
              Garantir meu Kit
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Benefícios em ícones */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center items-center gap-3 md:gap-6 mb-6"
          >
            <div className="flex items-center gap-2 text-sm text-white/90 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full">
              <span>📍</span>
              <span>Retirada grátis</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/90 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full">
              <span>⚡</span>
              <span>Pronto em 3 min</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/90 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full">
              <span>✅</span>
              <span>Garantia total</span>
            </div>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm"
          >
            <div className="flex items-center gap-2 text-foreground/80">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="font-medium">+200 kits entregues</span>
            </div>
            
            <div className="hidden sm:block w-1 h-1 rounded-full bg-muted-foreground/40" />
            
            <div className="flex items-center gap-2 text-foreground/80">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="font-medium">98% de satisfação</span>
            </div>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm mb-6"
          >
            <div className="flex items-center gap-2 text-white/80">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="font-medium">+200 kits entregues</span>
            </div>
            
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/40" />
            
            <div className="flex items-center gap-2 text-white/80">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="font-medium">98% de satisfação</span>
            </div>
          </motion.div>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="inline-flex items-center gap-2 text-sm text-white/80">
              <Clock className="w-4 h-4" />
              Pedidos encerram em:
            </span>
            <CountdownTimer variant="hero" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
