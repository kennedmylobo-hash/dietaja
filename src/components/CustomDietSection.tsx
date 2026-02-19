import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, Sparkles, Heart, ChefHat } from "lucide-react";
import { getUTMSummary } from "@/lib/utm";
import { useLandingContent } from "@/hooks/useLandingContent";

interface CustomDietSectionProps {
  whatsappNumber: string;
}

const defaultBenefits = [
  { icon: "ClipboardList", text: "Siga sua dieta médica ou nutricional" },
  { icon: "Heart", text: "Adapte para suas restrições alimentares" },
  { icon: "ChefHat", text: "Escolha exatamente os ingredientes" },
];

const iconMap: Record<string, any> = { ClipboardList, Heart, ChefHat };

const CustomDietSection = ({ whatsappNumber }: CustomDietSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { content, isVisible } = useLandingContent("custom_diet");

  if (!isVisible) return null;

  const title = content?.title ?? "Quer algo ainda mais personalizado?";
  const subtitle = content?.subtitle ?? "Montamos sua dieta sob medida — você envia seu cardápio e a gente prepara tudo pra você.";
  const buttonText = content?.button_text ?? "Montar minha dieta personalizada";
  const benefits = (content?.benefits ?? defaultBenefits).map((b: any) => ({
    icon: iconMap[b.icon] || ClipboardList,
    text: b.text,
  }));

  const handleWhatsAppClick = () => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Lead', { content_name: 'Dieta Personalizada' });
    }
    const message = `Oi! 😊\nQuero montar uma *dieta personalizada* com meu próprio cardápio.${getUTMSummary()}\n\nPode me ajudar com um orçamento?`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, "_blank");
  };

  return (
    <section ref={ref} className="py-16 bg-gradient-to-b from-sage-light/30 to-background">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Exclusivo</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{title}</h2>
          <p className="text-lg text-muted-foreground mb-8">{subtitle}</p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            {benefits.map((benefit: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border/50"
              >
                <benefit.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{benefit.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-4"
          >
            <Button onClick={handleWhatsAppClick} variant="cta" size="default" className="gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>{buttonText}</span>
            </Button>
            <p className="text-xs text-muted-foreground">
              Solicite um orçamento sem compromisso
            </p>

            <Link to="/monte-seu-cardapio" className="block">
              <Button variant="outline" size="default" className="gap-2 border-primary/30 hover:bg-primary/5">
                <Sparkles className="w-4 h-4 text-primary" />
                Monte com seus itens preferidos
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">
                Diga o que gosta e preparamos pra você
              </p>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CustomDietSection;
