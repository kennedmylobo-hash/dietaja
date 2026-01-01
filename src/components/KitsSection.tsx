import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart, HelpCircle } from "lucide-react";
import SalesQuizModal from "./SalesQuizModal";
import { useCart } from "./CartContext";
import { toast } from "@/hooks/use-toast";
import { useCarouselWithProgress } from "@/hooks/useCarouselWithProgress";
import { CarouselDots } from "./CarouselDots";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

interface Kit {
  id: string;
  name: string;
  days: number;
  price: number;
  pricePerDay: number;
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
    pricePerDay: 66.33,
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
    pricePerDay: 59.80,
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
    pricePerDay: 57.00,
    description: "Para quem quer constância, leveza e uma mudança mais profunda na rotina.",
    features: [
      "2 sopas funcionais por dia",
      "4 sucos detox por dia",
      "7 dias sem pensar na alimentação",
    ],
  },
];

const sopas = [
  { emoji: "🟠", nome: "Abóbora termogênica", ingredientes: "com gengibre", beneficio: "termogênico" },
  { emoji: "⚪", nome: "Aipim cremoso", ingredientes: "com alho-poró", beneficio: "digestivo" },
  { emoji: "🟢", nome: "Batata-doce", ingredientes: "com couve e chuchu", beneficio: "energético" },
];

const sucos = [
  { emoji: "🟢", nome: "Verde", ingredientes: "abacaxi, couve e gengibre", beneficio: "detox" },
  { emoji: "🩷", nome: "Rosa", ingredientes: "melancia com hortelã", beneficio: "hidratante" },
  { emoji: "🟡", nome: "Amarelo", ingredientes: "manga com cenoura", beneficio: "antioxidante" },
  { emoji: "🔴", nome: "Vermelho", ingredientes: "morango com hortelã", beneficio: "vitamina C" },
];

const KitsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { addItem } = useCart();
  const [quizOpen, setQuizOpen] = useState(false);

  // Track ViewContent when section becomes visible
  useEffect(() => {
    if (isInView && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_type: 'product_group',
        content_name: 'Kits Detox'
      });
    }
  }, [isInView]);

  const {
    api,
    setApi,
    current,
    count,
    progress,
    autoplayPlugin,
    setIsHoveringDots,
  } = useCarouselWithProgress(ref, { autoplayDelay: 3000 });

  const handleAddKit = (kit: Kit) => {
    addItem({
      type: "kit",
      name: kit.name,
      quantity: 1,
      unitPrice: kit.price,
      totalPrice: kit.price,
      description: `${kit.days} dias de detox completo`,
    });

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: kit.name,
    });
  };

  return (
    <section ref={ref} id="kits" className="py-12 md:py-20 lg:py-28 bg-card">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 bg-sage-light text-sage-dark text-sm font-medium rounded-full mb-4">
            🌿 Kits Detox
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
            Escolha seu caminho
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sucos e sopas funcionais para desintoxicar e renovar o corpo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            plugins={[autoplayPlugin]}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {kits.map((kit, index) => (
                <CarouselItem key={kit.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <motion.div
                    className={`relative rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-300 h-full flex flex-col ${
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-bold rounded-full shadow-md animate-pulse">
                          🔥 Mais Vendido
                        </span>
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-foreground">{kit.name}</h3>
                      <p className="text-muted-foreground text-sm mt-1">{kit.description}</p>
                    </div>

                    {kit.popular && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-terracotta bg-terracotta/10 px-2 py-1 rounded-full">
                          ⚠️ Restam poucas unidades
                        </span>
                      </div>
                    )}

                    <div className="mb-2">
                      <span className="text-2xl sm:text-3xl font-bold text-primary">R$ {kit.price}</span>
                    </div>
                    
                    <div className="mb-4 p-2 bg-sage-light/50 rounded-lg text-center">
                      <span className="text-sm text-foreground font-medium">
                        = R$ {kit.pricePerDay.toFixed(2).replace('.', ',')}/dia
                      </span>
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                      {kit.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={kit.popular ? "cta" : "cta-outline"}
                      className="w-full mt-auto"
                      onClick={() => handleAddKit(kit)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Adicionar ao carrinho
                    </Button>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-2 md:-left-4" />
            <CarouselNext className="hidden sm:flex -right-2 md:-right-4" />
          </Carousel>
          
          <CarouselDots
            count={count}
            current={current}
            progress={progress}
            api={api}
            onMouseEnter={() => setIsHoveringDots(true)}
            onMouseLeave={() => setIsHoveringDots(false)}
            activeColor="bg-primary"
          />

          {/* Sabores Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8"
          >
            <div className="bg-background border border-border rounded-xl p-3 sm:p-4 md:p-5">
              <h3 className="font-semibold text-foreground text-center mb-3 sm:mb-4 text-sm sm:text-base">
                Sabores dos sucos e sopas (Kit Detox)
              </h3>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {/* Sopas */}
                <div>
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2 text-sm">
                    🍲 Sopas Funcionais
                    <span className="text-xs font-normal text-muted-foreground">(3 sabores)</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {sopas.map((sopa) => (
                      <li key={sopa.nome} className="flex items-start gap-2 text-sm">
                        <span className="text-base leading-none mt-0.5">{sopa.emoji}</span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>
                            <span className="font-medium text-foreground">{sopa.nome}</span>
                            <span className="text-muted-foreground"> {sopa.ingredientes}</span>
                          </span>
                          <span className="px-1.5 sm:px-2 py-0.5 bg-primary/10 text-primary text-[10px] sm:text-xs font-medium rounded-full uppercase">
                            {sopa.beneficio}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sucos */}
                <div>
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2 text-sm">
                    🧃 Sucos Detox
                    <span className="text-xs font-normal text-muted-foreground">(4 sabores)</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {sucos.map((suco) => (
                      <li key={suco.nome} className="flex items-start gap-2 text-sm">
                        <span className="text-base leading-none mt-0.5">{suco.emoji}</span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>
                            <span className="font-medium text-foreground">{suco.nome}</span>
                            <span className="text-muted-foreground"> ({suco.ingredientes})</span>
                          </span>
                          <span className="px-1.5 sm:px-2 py-0.5 bg-primary/10 text-primary text-[10px] sm:text-xs font-medium rounded-full uppercase">
                            {suco.beneficio}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quiz CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 text-center"
          >
            <Button
              variant="outline"
              size="default"
              onClick={() => setQuizOpen(true)}
              className="gap-1.5 sm:gap-2 border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary animate-[pulse_2s_ease-in-out_infinite] hover:animate-none shadow-[0_0_15px_hsl(var(--primary)/0.3)] text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-6"
            >
              <HelpCircle className="w-4 h-4 md:w-5 md:h-5 animate-bounce flex-shrink-0" />
              <span className="sm:hidden">Descubra o kit ideal</span>
              <span className="hidden sm:inline">Não sabe qual escolher? Descubra o kit ideal</span>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <SalesQuizModal open={quizOpen} onOpenChange={setQuizOpen} />
    </section>
  );
};

export default KitsSection;
export type { Kit };
