import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";
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

const KitsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { addItem } = useCart();

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
    <section ref={ref} id="kits" className="py-20 md:py-28 bg-card">
      <div className="container px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 bg-sage-light text-sage-dark text-sm font-medium rounded-full mb-4">
            🌿 Kits Detox
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
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
                    className={`relative rounded-2xl p-6 transition-all duration-300 h-full flex flex-col ${
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
                      <span className="text-3xl font-bold text-primary">R$ {kit.price}</span>
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
            <CarouselPrevious className="-left-2 md:-left-4" />
            <CarouselNext className="-right-2 md:-right-4" />
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
        </motion.div>
      </div>
    </section>
  );
};

export default KitsSection;
export type { Kit };
