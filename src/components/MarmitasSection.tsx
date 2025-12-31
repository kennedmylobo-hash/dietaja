import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart, Clock } from "lucide-react";
import { useCart } from "./CartContext";
import { toast } from "@/hooks/use-toast";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

import marmita1 from "@/assets/marmita-1.png";
import marmita2 from "@/assets/marmita-2.png";
import marmita3 from "@/assets/marmita-3.png";

interface Marmita {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string;
  popular?: boolean;
}

const marmitas: Marmita[] = [
  {
    id: "7-marmitas",
    name: "Pacote Semanal",
    quantity: 7,
    unitPrice: 25.9,
    totalPrice: 181.3,
    image: marmita1,
  },
  {
    id: "14-marmitas",
    name: "Pacote Quinzenal",
    quantity: 14,
    unitPrice: 23.9,
    totalPrice: 334.6,
    image: marmita2,
    popular: true,
  },
  {
    id: "28-marmitas",
    name: "Pacote Mensal",
    quantity: 28,
    unitPrice: 19.9,
    totalPrice: 557.2,
    image: marmita3,
  },
];

const MarmitasSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const isSectionVisible = useInView(ref, { margin: "-50px" });
  const { addItem } = useCart();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const autoplayPlugin = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: true,
      stopOnMouseEnter: true,
    })
  );

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Pausar/retomar autoplay baseado na visibilidade
  useEffect(() => {
    if (!autoplayPlugin.current) return;
    
    if (isSectionVisible) {
      autoplayPlugin.current.play();
    } else {
      autoplayPlugin.current.stop();
    }
  }, [isSectionVisible]);

  const handleAddMarmita = (marmita: Marmita) => {
    addItem({
      type: "marmita",
      name: marmita.name,
      quantity: marmita.quantity,
      unitPrice: marmita.unitPrice,
      totalPrice: marmita.totalPrice,
      description: `${marmita.quantity} marmitas saudáveis`,
    });

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: `${marmita.name} (${marmita.quantity} marmitas)`,
    });
  };

  return (
    <section ref={ref} id="marmitas" className="py-20 md:py-28 bg-background">
      <div className="container px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-1.5 bg-terracotta-light text-terracotta text-sm font-medium rounded-full mb-4">
            🍱 Marmitas Saudáveis Congeladas
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Praticidade no dia a dia
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Pronto em 3 minutos no micro-ondas. Sabores a consultar via WhatsApp.
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
            plugins={[autoplayPlugin.current]}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {marmitas.map((marmita, index) => (
                <CarouselItem key={marmita.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <motion.div
                    className={`relative rounded-2xl overflow-hidden transition-all duration-300 h-full ${
                      marmita.popular
                        ? "bg-gradient-to-br from-terracotta-light to-card border-2 border-terracotta shadow-card"
                        : "bg-card border border-border hover:border-terracotta/30 hover:shadow-soft"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    {marmita.popular && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-terracotta text-white text-xs font-bold rounded-full">
                          💚 Melhor Custo-Benefício
                        </span>
                      </div>
                    )}

                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={marmita.image}
                        alt={`${marmita.name} - ${marmita.quantity} marmitas`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        {marmita.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {marmita.quantity} marmitas saudáveis
                      </p>

                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-bold text-terracotta">
                          R$ {marmita.unitPrice.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-sm text-muted-foreground">cada</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Clock className="w-4 h-4" />
                        <span>Total: R$ {marmita.totalPrice.toFixed(2).replace(".", ",")}</span>
                      </div>

                      <Button
                        variant={marmita.popular ? "cta" : "cta-outline"}
                        className="w-full"
                        onClick={() => handleAddMarmita(marmita)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Adicionar ao carrinho
                      </Button>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-2 md:-left-4" />
            <CarouselNext className="-right-2 md:-right-4" />
          </Carousel>
          
          {/* Dots indicadores */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                className={`rounded-full transition-all duration-300 ${
                  index === current
                    ? "w-4 h-2 bg-terracotta"
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MarmitasSection;
