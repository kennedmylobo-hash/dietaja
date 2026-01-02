import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, Loader2, Beef, Drumstick, Utensils, Sparkles, Scale } from "lucide-react";
import { useCart } from "./CartContext";
import { toast } from "@/hooks/use-toast";
import { hapticFeedback } from "@/lib/haptics";
import { useCarouselWithProgress } from "@/hooks/useCarouselWithProgress";
import { CarouselDots } from "./CarouselDots";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
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

// Sabores organizados por categoria
const saboresCarnes = [
  "Almôndegas com Espaguete",
  "Almôndegas de Carne com Lascas de Abóbora",
  "Carne Desfiada com Arroz à Grega e Purê de Abóbora",
  "Carne Desfiada com Arroz Branco e Purê de Abóbora",
  "Carne do Sol com Baião de Dois e Aipim",
  "Carne Moída com Arroz Branco e Feijão Carioca",
  "Carne Moída com Arroz Branco e Feijão Preto",
  "Carne Moída com Arroz Integral e Feijão Carioca",
  "Estrogonofe de Carne com Arroz Branco",
  "Estrogonofe de Carne com Batata Rústica",
  "Isca de Carne ao Molho de Mostarda com Arroz Integral e Legumes",
  "Hambúrguer com Arroz Integral e Purê de Abóbora",
];

const saboresFrangos = [
  "Creme de Frango com Arroz Integral e Feijão Carioca",
  "Creme de Frango com Batata Rústica e Purê de Abóbora",
  "Creme de Frango com Arroz Branco e Purê de Abóbora",
  "Escondidinho de Batata Doce com Frango",
  "Estrogonofe de Frango com Arroz Branco",
  "Estrogonofe de Frango com Batata Doce",
  "Estrogonofe de Frango com Arroz Branco e Batata Rústica",
  "Frango à Parmegiana com Purê de Batata",
  "Frango ao Molho de Laranja com Arroz Integral e Brócolis",
  "Frango Xadrez com Arroz Integral e Legumes",
  "Frango Xadrez com Arroz à Grega",
  "Fricassê de Frango com Arroz Branco",
  "Fricassê de Frango com Batata Rústica",
  "Panqueca de Frango com Arroz Branco",
];

const saboresMassas = [
  "Espaguete Integral com Carne",
  "Espaguete Integral com Frango",
  "Macarronada à Bolonhesa",
  "Macarronada de Frango ao Molho Bechamel",
];

const saboresEspeciais = [
  "Escondidinho de Batata Inglesa com Carne Desfiada",
  "Escondidinho de Batata Inglesa com Carne Moída",
  "Escondidinho de Aipim com Carne Desfiada",
  "Feijoada Light com Arroz Branco e Couve",
  "Filé de Peixe com Alecrim, Arroz Integral e Purê de Abóbora",
  "Filé Suíno ao Molho de Laranja e Mel com Purê de Aipim",
];

const MarmitasSection = () => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { addItem } = useCart();
  const [loadingMarmita, setLoadingMarmita] = useState<string | null>(null);

  // Track ViewContent when section becomes visible
  useEffect(() => {
    if (isInView && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_type: 'product_group',
        content_name: 'Marmitas Saudáveis'
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

  const handleAddMarmita = async (marmita: Marmita) => {
    setLoadingMarmita(marmita.id);
    
    // Simulate brief loading for feedback
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addItem({
      type: "marmita",
      name: marmita.name,
      quantity: marmita.quantity,
      unitPrice: marmita.unitPrice,
      totalPrice: marmita.totalPrice,
      description: `${marmita.quantity} marmitas saudáveis`,
    });

    // Haptic feedback on mobile
    hapticFeedback('success');

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: `${marmita.name} (${marmita.quantity} marmitas)`,
    });
    
    setLoadingMarmita(null);
  };

  return (
    <section ref={ref} id="marmitas" className="py-12 md:py-20 lg:py-28 bg-background">
      <div className="container px-4 md:px-6">
        <motion.div
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 sm:px-4 py-1.5 bg-terracotta-light text-terracotta text-xs sm:text-sm font-medium rounded-full mb-4">
            🍱 Marmitas Saudáveis Congeladas
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
            Praticidade no dia a dia
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Pronto em 3 minutos no micro-ondas. <strong>36 sabores</strong> para você escolher!
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
              align: "start",
              loop: true,
            }}
            plugins={[autoplayPlugin]}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {marmitas.map((marmita, index) => (
                <CarouselItem key={marmita.id} className="pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3">
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
                    {/* Badge 300g */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sage/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                        <Scale className="w-3 h-3" />
                        300g
                      </span>
                    </div>

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
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={300}
                      />
                    </div>

                    <div className="p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                        {marmita.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        {marmita.quantity} marmitas saudáveis
                      </p>

                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl sm:text-2xl font-bold text-terracotta">
                          R$ {marmita.unitPrice.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">cada</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Clock className="w-4 h-4" />
                        <span>Total: R$ {marmita.totalPrice.toFixed(2).replace(".", ",")}</span>
                      </div>

                      <Button
                        variant={marmita.popular ? "cta" : "cta-outline"}
                        className="w-full"
                        onClick={() => handleAddMarmita(marmita)}
                        disabled={loadingMarmita === marmita.id}
                      >
                        {loadingMarmita === marmita.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adicionando...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Adicionar ao carrinho
                          </>
                        )}
                      </Button>
                    </div>
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
            activeColor="bg-terracotta"
          />
        </motion.div>

        {/* Seção de Sabores */}
        <motion.div
          className="mt-12 md:mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Cardápio de Sabores
            </h3>
            <p className="text-sm text-muted-foreground">
              Todas as marmitas com <strong className="text-terracotta">300g</strong> de pura comida de verdade
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Carnes */}
            <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Beef className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <h4 className="font-semibold text-foreground">Carnes</h4>
                <span className="text-xs text-muted-foreground">({saboresCarnes.length})</span>
              </div>
              <ul className="grid grid-cols-1 gap-1.5">
                {saboresCarnes.map((sabor, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-muted-foreground flex items-start gap-1.5">
                    <span className="text-terracotta mt-0.5">•</span>
                    {sabor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Frangos */}
            <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Drumstick className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h4 className="font-semibold text-foreground">Frangos</h4>
                <span className="text-xs text-muted-foreground">({saboresFrangos.length})</span>
              </div>
              <ul className="grid grid-cols-1 gap-1.5">
                {saboresFrangos.map((sabor, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-muted-foreground flex items-start gap-1.5">
                    <span className="text-terracotta mt-0.5">•</span>
                    {sabor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Massas */}
            <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Utensils className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-semibold text-foreground">Massas</h4>
                <span className="text-xs text-muted-foreground">({saboresMassas.length})</span>
              </div>
              <ul className="grid grid-cols-1 gap-1.5">
                {saboresMassas.map((sabor, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-muted-foreground flex items-start gap-1.5">
                    <span className="text-terracotta mt-0.5">•</span>
                    {sabor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Especiais */}
            <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-foreground">Especiais</h4>
                <span className="text-xs text-muted-foreground">({saboresEspeciais.length})</span>
              </div>
              <ul className="grid grid-cols-1 gap-1.5">
                {saboresEspeciais.map((sabor, idx) => (
                  <li key={idx} className="text-xs md:text-sm text-muted-foreground flex items-start gap-1.5">
                    <span className="text-terracotta mt-0.5">•</span>
                    {sabor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MarmitasSection;
