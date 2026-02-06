import { motion } from "framer-motion";
import { Shuffle, Wallet, Truck, HeartHandshake, Zap } from "lucide-react";

const benefits = [
  {
    icon: Shuffle,
    title: "Sabores sortidos",
    description: "Todo mês uma surpresa diferente no seu kit. Variedade sem repetir!",
  },
  {
    icon: Wallet,
    title: "Preço mais acessível",
    description: "Assinante paga menos que pedidos avulsos. Economia real todo mês.",
  },
  {
    icon: Truck,
    title: "Entrega automática",
    description: "Sem precisar pedir de novo. Chega na sua porta todo mês.",
  },
  {
    icon: HeartHandshake,
    title: "Sem fidelidade",
    description: "Cancele quando quiser, sem multa e sem burocracia.",
  },
  {
    icon: Zap,
    title: "Zero esforço",
    description: "Nada de planejar cardápio. A gente cuida de tudo pra você.",
  },
];

const ClubBenefits = () => {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Por que assinar o Clube?
          </h2>
          <p className="text-muted-foreground">
            Vantagens exclusivas para assinantes
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ClubBenefits;
