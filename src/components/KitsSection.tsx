import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

interface Kit {
  id: string;
  name: string;
  days: number;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const kits: Kit[] = [
  {
    id: "3-dias",
    name: "Kit Detox 3 Dias",
    days: 3,
    price: 199,
    description: "Um respiro para o corpo e para a rotina. Ideal para desinchar e retomar o controle.",
    features: [
      "2 sopas funcionais por dia",
      "4 sucos detox por dia",
      "Praticidade total por 3 dias",
    ],
  },
  {
    id: "5-dias",
    name: "Kit Detox 5 Dias",
    days: 5,
    price: 299,
    description: "O equilíbrio ideal entre resultado e praticidade. Tempo suficiente para o corpo responder de verdade.",
    features: [
      "2 sopas funcionais por dia",
      "4 sucos detox por dia",
      "Organização completa por 5 dias",
      "Melhor custo-benefício",
    ],
    popular: true,
  },
  {
    id: "7-dias",
    name: "Kit Detox 7 Dias",
    days: 7,
    price: 399,
    description: "Para quem quer constância, leveza e uma mudança mais profunda na rotina.",
    features: [
      "2 sopas funcionais por dia",
      "4 sucos detox por dia",
      "7 dias sem pensar na alimentação",
    ],
  },
];

interface KitsSectionProps {
  onSelectKit: (kit: Kit) => void;
}

const KitsSection = ({ onSelectKit }: KitsSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} id="kits" className="py-20 md:py-28 bg-card">
      <div className="container px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 bg-sage-light text-sage-dark text-sm font-medium rounded-full mb-4">
            🌿 Kits Detox
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Escolha seu caminho
          </h2>
        </motion.div>

        <div className="max-w-xl mx-auto space-y-6">
          {kits.map((kit, index) => (
            <motion.div
              key={kit.id}
              className={`relative rounded-2xl p-6 md:p-8 transition-all duration-300 ${
                kit.popular 
                  ? "bg-gradient-to-br from-sage-light to-card border-2 border-primary shadow-card" 
                  : "bg-card border border-border hover:border-primary/30 hover:shadow-soft"
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {kit.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    Mais escolhido
                  </span>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{kit.name}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{kit.description}</p>
                </div>
                <div className="text-right md:text-left">
                  <span className="text-3xl font-bold text-primary">R$ {kit.price}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {kit.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                variant={kit.popular ? "cta" : "cta-outline"}
                className="w-full"
                onClick={() => onSelectKit(kit)}
              >
                Quero esse caminho
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KitsSection;
export type { Kit };
