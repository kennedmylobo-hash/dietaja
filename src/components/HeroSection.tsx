import { Star, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import produtosVideo from "@/assets/produtos-detox-video.mp4";
import CountdownTimer from "@/components/CountdownTimer";

interface HeroSectionProps {
  onScrollToSection: (sectionId: string) => void;
}

const objectiveOptions = [
  {
    id: "kits",
    title: "Kit Detox",
    description: "Emagreça até 3kg em 3 dias",
  },
  {
    id: "marmitas",
    title: "Marmitas Saudáveis",
    description: "Economize até R$15/refeição",
  },
  {
    id: "dieta-personalizada",
    title: "Dieta Personalizada",
    description: "Resultados garantidos",
  },
];

const HeroSection = ({ onScrollToSection }: HeroSectionProps) => {

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background with video */}
      <div className="absolute inset-0 z-0">
        <video
          src={produtosVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 15%' }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
      </div>

      <div className="relative z-10 container px-4 md:px-6 py-12 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          {/* Badge de localização - PRIMEIRO */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-3 animate-fade-in">
            <span className="text-xs sm:text-sm font-medium text-white">
              📍 Entregamos apenas em Vitória da Conquista - BA
            </span>
          </div>


          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mt-6 mb-6 animate-fade-in">
            Coma melhor mesmo sem tempo —{" "}
            <span className="text-primary">e sinta seu corpo responder.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 leading-relaxed animate-fade-in">
            Alimentação saudável pronta para quem tem rotina corrida em{" "}
            <strong className="text-white">Vitória da Conquista</strong>.
          </p>

          {/* Objetivo - 3 Opções */}
          <div className="mb-8 animate-fade-in">
            <p className="text-sm sm:text-base text-white/80 mb-4 font-medium">
              Qual é o seu objetivo?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              {objectiveOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 0.3 + index * 0.15,
                    ease: "easeOut"
                  }}
                  onClick={() => onScrollToSection(option.id)}
                  className="
                    group flex-1 max-w-[320px] mx-auto sm:mx-0
                    flex items-center justify-between gap-3
                    px-5 py-4 sm:px-6 sm:py-5
                    rounded-xl
                    bg-primary/80 backdrop-blur-md
                    border-2 border-primary/60 shadow-lg
                    transition-all duration-300 ease-out
                    hover:bg-primary hover:border-white/50
                    hover:scale-[1.03] hover:-translate-y-0.5
                    hover:shadow-[0_0_25px_rgba(134,239,172,0.5)]
                    active:scale-95
                  "
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-white font-bold text-base sm:text-lg">
                      {option.title}
                    </span>
                    <span className="text-white/90 text-xs sm:text-sm">
                      {option.description}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 transition-transform group-hover:translate-x-1" />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Benefícios em ícones */}
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/90 bg-white/10 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-full">
              <span>📍</span>
              <span>Retirada grátis</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/90 bg-white/10 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-full">
              <span>⚡</span>
              <span>Pronto em 3 min</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/90 bg-white/10 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-full">
              <span>✅</span>
              <span>Garantia total</span>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm mb-6 animate-fade-in">
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
          </div>

          {/* Countdown Timer */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 animate-fade-in">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/80">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Pedidos encerram domingo • Entrega quarta:</span>
              <span className="sm:hidden">Encerra domingo:</span>
            </span>
            <CountdownTimer variant="hero" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
