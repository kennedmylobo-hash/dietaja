import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, Sparkles, Heart, ChefHat } from "lucide-react";

interface CustomDietSectionProps {
  whatsappNumber: string;
}

const CustomDietSection = ({ whatsappNumber }: CustomDietSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const benefits = [
    { icon: ClipboardList, text: "Siga sua dieta médica ou nutricional" },
    { icon: Heart, text: "Adapte para suas restrições alimentares" },
    { icon: ChefHat, text: "Escolha exatamente os ingredientes" },
  ];

  const handleWhatsAppClick = () => {
    const message = `Oi! 😊\nQuero montar uma *dieta personalizada* com meu próprio cardápio.\n\nPode me ajudar com um orçamento?`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, "_blank");
  };

  return (
    <section ref={ref} className="py-16 bg-gradient-to-b from-sage-light/30 to-background">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Exclusivo</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Quer algo ainda mais personalizado?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Montamos sua dieta <span className="text-primary font-semibold">sob medida</span> — 
            você envia seu cardápio e a gente prepara tudo pra você.
          </p>

          {/* Benefits */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border/50"
              >
                <benefit.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{benefit.text}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Button
              onClick={handleWhatsAppClick}
              variant="cta"
              size="lg"
              className="gap-3"
            >
              <span>Quero montar minha dieta personalizada</span>
              <span className="text-xl">→</span>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Solicite um orçamento sem compromisso
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CustomDietSection;
