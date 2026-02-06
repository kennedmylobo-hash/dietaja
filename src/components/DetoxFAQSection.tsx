import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const detoxFaqs = [
  {
    question: "Vou sentir fraqueza durante o detox?",
    answer: "Não! Nossos kits são formulados para fornecer energia e nutrientes essenciais. Você pode sentir uma leve adaptação no primeiro dia, mas depois a maioria dos clientes relata aumento de disposição e clareza mental.",
  },
  {
    question: "Posso trabalhar normalmente enquanto faço o detox?",
    answer: "Sim! O detox foi pensado para pessoas com rotina ativa. Você continua sua vida normalmente, com 4 sucos ao longo do dia e 2 sopas nutritivas. Não é um jejum restritivo.",
  },
  {
    question: "O detox causa desconforto no estômago?",
    answer: "Nossos sucos e sopas são feitos com ingredientes naturais e suaves. A maioria dos clientes não sente desconforto. Se você tem sensibilidade, recomendamos começar pelo kit de 3 dias.",
  },
  {
    question: "Qual a diferença entre os kits de 3, 5 e 7 dias?",
    answer: "O kit de 3 dias é ideal para uma limpeza rápida e para quem está começando. O de 5 dias oferece resultados mais visíveis na redução de inchaço. O de 7 dias é recomendado para uma renovação completa e preparo para uma nova rotina alimentar.",
  },
  {
    question: "Quando é o melhor momento para fazer o detox?",
    answer: "Recomendamos fazer antes de iniciar uma dieta, após períodos de excessos (festas, feriados), ou quando sentir que precisa de uma 'limpeza' no organismo. É perfeito para quem quer começar uma alimentação saudável com o pé direito.",
  },
  {
    question: "Posso repetir o detox com frequência?",
    answer: "Sim! Muitos clientes fazem o detox mensalmente como manutenção. O ideal é dar um intervalo de pelo menos 2 semanas entre os ciclos para que o corpo absorva os benefícios.",
  },
];

const DetoxFAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 md:py-16 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
            Dúvidas sobre o Detox
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Tudo que você precisa saber antes de começar
          </p>
        </motion.div>

        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-2">
            {detoxFaqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-4 data-[state=open]:bg-primary/5"
              >
                <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default DetoxFAQSection;
