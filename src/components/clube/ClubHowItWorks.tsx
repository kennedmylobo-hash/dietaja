import { motion } from "framer-motion";
import { Package, UserPlus, CalendarCheck } from "lucide-react";

const steps = [
  {
    icon: Package,
    title: "Escolha o kit",
    description: "Selecione o kit ideal para sua rotina alimentar",
  },
  {
    icon: UserPlus,
    title: "Cadastre-se",
    description: "Preencha seus dados e pague o primeiro mês via PIX",
  },
  {
    icon: CalendarCheck,
    title: "Receba todo mês",
    description: "A cobrança é automática e o kit chega na sua porta mensalmente",
  },
];

const ClubHowItWorks = () => {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Como funciona
          </h2>
          <p className="text-muted-foreground">Simples e sem burocracia</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
                className="text-center"
              >
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white dark:bg-amber-500 flex items-center justify-center shadow-lg">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ClubHowItWorks;
