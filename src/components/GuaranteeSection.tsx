import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, Lock, MapPin, Heart } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useLandingContent } from "@/hooks/useLandingContent";

const iconMap: Record<string, any> = { Shield, Lock, MapPin, Heart };
const defaultIcons = [Shield, Lock, MapPin];

const getDefaultGuarantees = () => [
  { icon: "Shield", title: "Garantia de satisfação", description: "Não gostou? Devolvemos seu dinheiro sem burocracia." },
  { icon: "Lock", title: "Pagamento seguro", description: "Pix ou cartão com total segurança. Seus dados protegidos." },
  { icon: "MapPin", title: "Produção local", description: `Feito em ${siteConfig.location.city} com ingredientes frescos.` },
];

const GuaranteeSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { content, isVisible } = useLandingContent("guarantee");

  if (!isVisible) return null;

  const guarantees = content?.items ?? getDefaultGuarantees();

  return (
    <section ref={ref} className="py-12 md:py-16 lg:py-20 bg-sage-light/20">
      <div className="container px-4 md:px-6">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Sua tranquilidade garantida
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Compre sem preocupação</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {guarantees.map((item: any, index: number) => {
              const Icon = iconMap[item.icon] || defaultIcons[index % defaultIcons.length];
              return (
                <motion.div
                  key={item.title}
                  className="bg-card rounded-xl p-4 sm:p-6 border border-border text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    {typeof item.icon === "string" && item.icon.length <= 4 ? (
                      <span className="text-lg">{item.icon}</span>
                    ) : (
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GuaranteeSection;
