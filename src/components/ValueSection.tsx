import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Package, Smile, Sparkles } from "lucide-react";
import { useLandingContent } from "@/hooks/useLandingContent";

const iconMap: Record<string, any> = { Package, Smile, Sparkles };

const ValueSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { isVisible } = useLandingContent("custom_diet"); // reuse visibility from a related section

  const values = [
    { icon: Package, text: "Menos cansaço mental" },
    { icon: Smile, text: "Mais leveza no corpo" },
    { icon: Sparkles, text: "Mais constância na rotina" },
  ];

  return (
    <section ref={ref} className="py-12 md:py-20 lg:py-28 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div 
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-lg sm:text-xl md:text-2xl text-foreground leading-relaxed mb-4">
            Não é só sobre sucos, sopas e marmitas.
          </p>
          
          <p className="text-base sm:text-lg text-primary font-semibold mb-6 sm:mb-8">
            É sobre abrir o freezer e saber que sua alimentação está resolvida.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {values.map((value, index) => (
              <motion.div
                key={value.text}
                className="flex flex-col items-center gap-2.5 sm:gap-3 p-4 sm:p-6 rounded-xl bg-card border border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-sage-light flex items-center justify-center">
                  <value.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <span className="font-medium text-foreground text-sm sm:text-base">{value.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ValueSection;
