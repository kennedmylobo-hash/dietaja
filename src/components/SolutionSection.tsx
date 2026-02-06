import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Sparkles, Clock, Heart } from "lucide-react";
import { useLandingContent } from "@/hooks/useLandingContent";
const SolutionSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { content, isVisible } = useLandingContent("solution");

  if (!isVisible) return null;

  const features = content?.features ?? [
    { icon: "Sparkles", title: "Sem precisar pensar", description: "" },
    { icon: "Clock", title: "Praticidade total", description: "" },
    { icon: "Heart", title: "Constância no cuidado", description: "" },
  ];

  return (
    <section ref={ref} className="py-12 md:py-20 lg:py-28 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8 md:mb-12">
            <p className="text-lg sm:text-xl md:text-2xl text-foreground leading-relaxed mb-4">
              {content?.title ?? "A solução não é força de vontade."}
              <br />
              <span className="text-primary font-semibold">{content?.subtitle ?? "É praticidade."}</span>
            </p>
          </div>

          <div className="bg-sage-light/50 rounded-2xl p-5 sm:p-8 md:p-10 border border-primary/10">
            <p className="text-base sm:text-lg text-foreground leading-relaxed mb-6 sm:mb-8 text-center">
              {content?.description ?? <>Criamos kits prontos para que você <strong>não precise pensar</strong>, apenas seguir.</>}
            </p>

            <p className="text-sm sm:text-base text-muted-foreground text-center leading-relaxed">
              Você abre o freezer, resolve sua alimentação e segue com a sua vida 
              — com mais leveza e constância.
            </p>

            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-4 mt-6 sm:mt-8">
              {features.map((feature: any, index: number) => {
                const iconMap: Record<string, any> = { Sparkles, Clock, Heart };
                const FeatureIcon = iconMap[feature.icon] || Sparkles;
                return (
                  <motion.div
                    key={feature.title}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-card rounded-full border border-border"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  >
                    <FeatureIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-foreground">{feature.title || feature.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SolutionSection;
