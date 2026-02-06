import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Posso cancelar a assinatura a qualquer momento?",
    answer:
      "Sim! Não há fidelidade. Você pode cancelar quando quiser entrando em contato pelo nosso WhatsApp. O cancelamento é imediato e sem multa.",
  },
  {
    question: "Como funciona a cobrança?",
    answer:
      "A cobrança é mensal e automática via PIX. Você receberá uma notificação antes de cada cobrança para preparar o pagamento.",
  },
  {
    question: "Posso trocar o kit depois de assinar?",
    answer:
      "Sim! Basta entrar em contato pelo WhatsApp e trocaremos o tipo do kit a partir do próximo mês.",
  },
  {
    question: "Qual o dia da entrega?",
    answer:
      "As entregas acontecem na primeira semana de cada mês. Você será notificado sobre a data exata com antecedência.",
  },
  {
    question: "Os sabores são sempre os mesmos?",
    answer:
      "Não! Os sabores são sortidos e variam todo mês. Assim você experimenta diferentes receitas e nunca enjoa.",
  },
  {
    question: "Posso escolher os sabores?",
    answer:
      "No momento os sabores são sortidos por nossa equipe para garantir variedade. Se tiver alguma restrição alimentar, informe pelo WhatsApp.",
  },
];

const ClubFAQ = () => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Perguntas frequentes
          </h2>
          <p className="text-muted-foreground">Tire suas dúvidas sobre o Clube</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default ClubFAQ;
