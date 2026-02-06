import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fitnessFaqs = [
  {
    question: "Quanta proteína tem em cada marmita Fitness?",
    answer: "Nossas marmitas Fitness de 450g são formuladas com porção generosa de proteína (aproximadamente 150g entre carnes, frangos e ovos) para suporte ao ganho de massa muscular, além de 200g de carboidrato e 100g de vegetais.",
  },
  {
    question: "A marmita substitui o whey pós-treino?",
    answer: "A marmita Fitness é uma refeição completa e pode ser consumida como pós-treino. Muitos atletas preferem uma refeição sólida após o treino. Se você já usa whey, a marmita complementa perfeitamente como refeição principal.",
  },
  {
    question: "Posso comer antes ou depois do treino?",
    answer: "Ambos! Como pré-treino, consuma pelo menos 1h30 antes para garantir boa digestão e energia. Como pós-treino, é ideal para a janela anabólica, fornecendo proteína e carboidrato de qualidade para recuperação muscular.",
  },
  {
    question: "Qual a diferença entre Fitness (450g) e Fit (300g)?",
    answer: "A linha Fitness (450g) tem porção 50% maior com mais proteína e carboidrato, voltada para quem treina pesado e busca hipertrofia. A linha Fit (300g) é para quem busca emagrecimento com porções controladas.",
  },
  {
    question: "Tem opção com mais carboidrato?",
    answer: "Sim! Nosso cardápio inclui opções variadas. Na hora de montar seu pacote, você pode priorizar sabores com acompanhamentos mais ricos em carboidrato, como massas e arroz. Perfeito para quem precisa de mais energia nos treinos.",
  },
  {
    question: "Com que frequência devo pedir?",
    answer: "Para resultados consistentes na hipertrofia, recomendamos pacotes semanais ou quinzenais. O pacote de 28 unidades oferece o melhor custo-benefício e garante que você nunca fique sem refeição de qualidade.",
  },
];

const FitnessFAQSection = () => {
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
            Dúvidas sobre a Linha Fitness
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Tudo que você precisa saber para treinar com alimentação de qualidade
          </p>
        </motion.div>

        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-2">
            {fitnessFaqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-4 data-[state=open]:bg-terracotta/5"
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

export default FitnessFAQSection;
