import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, Lock, MapPin, Heart } from "lucide-react";

const guarantees = [
  {
    icon: Shield,
    title: "Garantia de satisfação",
    description: "Não gostou? Devolvemos seu dinheiro sem burocracia.",
  },
  {
    icon: Lock,
    title: "Pagamento seguro",
    description: "Pix ou cartão com total segurança. Seus dados protegidos.",
  },
  {
    icon: MapPin,
    title: "Produção local",
    description: "Feito em Vitória da Conquista com ingredientes frescos.",
  },
];

const GuaranteeSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 md:py-20 bg-sage-light/20">
      <div className="container px-6">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Heart className="w-4 h-4" />
              Sua tranquilidade garantida
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Compre sem preocupação
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {guarantees.map((item, index) => (
              <motion.div
                key={item.title}
                className="bg-card rounded-xl p-6 border border-border text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GuaranteeSection;
