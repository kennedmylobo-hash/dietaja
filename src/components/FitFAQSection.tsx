import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fitFaqs = [
  {
    question: "Quantas calorias tem cada marmita Fit?",
    answer: "Nossas marmitas Fit de 300g são balanceadas para oferecer uma refeição completa com controle calórico. A quantidade exata varia por sabor, mas todas são formuladas para apoiar o emagrecimento saudável sem deixar você com fome.",
  },
  {
    question: "Posso comer só marmita Fit e emagrecer?",
    answer: "Sim! Muitos clientes utilizam nossas marmitas como a refeição principal do dia e conseguem resultados excelentes. O segredo é manter a consistência e complementar com lanches leves entre as refeições.",
  },
  {
    question: "Preciso fazer dieta além da marmita?",
    answer: "A marmita Fit já é uma refeição equilibrada e com porção controlada. Não precisa de dieta restritiva! Basta manter hábitos saudáveis nas outras refeições e você verá resultados progressivos.",
  },
  {
    question: "Qual a diferença entre Fit (300g) e Fitness (450g)?",
    answer: "A linha Fit (300g) é ideal para quem busca emagrecimento com porções controladas. A linha Fitness (450g) tem porção maior com mais proteína, voltada para quem treina pesado e busca ganho de massa muscular.",
  },
  {
    question: "Posso escolher marmitas sem carboidrato?",
    answer: "Nosso cardápio oferece diversas opções com diferentes composições. Você pode priorizar sabores com menos carboidrato na hora de montar seu pacote. Consulte nosso cardápio para ver todas as opções disponíveis.",
  },
  {
    question: "Com que frequência devo pedir?",
    answer: "Recomendamos pacotes semanais (7 unidades) para manter a consistência. Quanto maior o pacote, menor o preço por unidade. Muitos clientes pedem a cada semana para garantir frescor e variedade.",
  },
];

const FitFAQSection = () => {
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
            Dúvidas sobre a Linha Fit
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Tudo que você precisa saber para emagrecer com praticidade
          </p>
        </motion.div>

        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-2">
            {fitFaqs.map((faq, index) => (
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

export default FitFAQSection;
