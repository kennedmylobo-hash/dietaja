import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Quote, Heart } from "lucide-react";

const TestimonialsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 md:py-28 bg-sage-light/30">
      <div className="container px-6">
        <motion.div 
          className="max-w-2xl mx-auto space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-card rounded-2xl p-8 shadow-soft border border-border relative">
            <Quote className="absolute top-6 left-6 w-8 h-8 text-primary/20" />
            <p className="text-lg text-foreground leading-relaxed italic pl-6 pt-4">
              "Entre trabalho, casa e rotina, eu sempre ficava por último.
              Ter a alimentação pronta foi um cuidado que eu estava devendo comigo mesma."
            </p>
          </div>

          <div className="bg-terracotta-light/50 rounded-2xl p-6 border border-terracotta/20">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-terracotta flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-terracotta block mb-2">
                  Mensagem que recebemos:
                </span>
                <p className="text-foreground">
                  "Chegar cansada e saber que tem comida saudável pronta muda tudo. 
                  Obrigada por isso 💚"
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
