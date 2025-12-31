import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Package, Smile, Sparkles } from "lucide-react";

const ValueSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const values = [
    { icon: Package, text: "Menos cansaço mental" },
    { icon: Smile, text: "Mais leveza no corpo" },
    { icon: Sparkles, text: "Mais constância na rotina" },
  ];

  return (
    <section ref={ref} className="py-20 md:py-28 bg-background">
      <div className="container px-6">
        <motion.div 
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xl md:text-2xl text-foreground leading-relaxed mb-4">
            Não é só sobre sucos, sopas e marmitas.
          </p>
          
          <p className="text-lg text-primary font-semibold mb-8">
            É sobre abrir o freezer e saber que sua alimentação está resolvida.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {values.map((value, index) => (
              <motion.div
                key={value.text}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-sage-light flex items-center justify-center">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="font-medium text-foreground">{value.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ValueSection;
