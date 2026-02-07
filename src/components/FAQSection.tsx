import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { useLandingContent } from "@/hooks/useLandingContent";
import { useTenantConfig } from "@/hooks/useTenantConfig";

interface FAQSectionProps {
  onContactClick: () => void;
}

const FAQSection = ({ onContactClick }: FAQSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { content, isVisible } = useLandingContent("faq");
  const { location, formatCurrency } = useTenantConfig();

  const getDefaultFaqItems = () => [
    { question: "Preciso seguir alguma dieta específica?", answer: "Não. Os kits e marmitas foram pensados para simplificar, não para complicar. É só seguir e cuidar de você." },
    { question: "Vou passar fome?", answer: "Não. A ideia não é sofrimento, é equilíbrio e constância." },
    { question: "Isso é só para emagrecer?", answer: "Não. O foco é organizar a alimentação, reduzir inchaço e trazer leveza. O resultado vem como consequência." },
    { question: "Nunca fiz detox, posso começar?", answer: "Sim! O Kit Detox 5 Dias é o mais escolhido por quem está começando." },
    { question: "Como recebo meu pedido?", answer: `Tudo é entregue congelado e pronto para consumo. Retirada grátis no bairro ${location.pickupNeighborhood} ou entrega por ${formatCurrency(location.deliveryFee)}.` },
    { question: "Posso pedir só as marmitas, sem o kit detox?", answer: "Claro! Você pode montar seu pedido como preferir." },
    { question: `Vocês atendem ${location.city}?`, answer: `Sim 😊 Retirada grátis no bairro ${location.pickupNeighborhood} ou entrega por ${formatCurrency(location.deliveryFee)}.` },
  ];

  if (!isVisible) return null;

  const faqItems = content?.items ?? getDefaultFaqItems();

  return (
    <section ref={ref} className="py-20 md:py-28 bg-background">
      <div className="container px-6">
        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 bg-sage-light text-sage-dark text-sm font-medium rounded-full mb-4">
              ❓ Dúvidas frequentes
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Perguntas e Respostas</h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item: any, index: number) => (
              <motion.div
                key={index}
                className="bg-card rounded-xl border border-border overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                >
                  <span className="font-medium text-foreground pr-4">{item.question}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""}`} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openIndex === index ? "auto" : 0, opacity: openIndex === index ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-muted-foreground leading-relaxed">{item.answer}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-8 p-6 rounded-xl bg-sage-light/30 border border-primary/20 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <p className="text-foreground mb-4">Tem outras dúvidas? Sem problema 💚</p>
            <button onClick={onContactClick} className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
              <MessageCircle className="w-4 h-4" />
              Fale com a gente no WhatsApp
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
