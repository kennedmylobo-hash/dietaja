import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart, HelpCircle, Loader2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import SalesQuizModal from "./SalesQuizModal";
import { useCart, FlavorSelection } from "./CartContext";
import { toast } from "@/hooks/use-toast";
import { hapticFeedback } from "@/lib/haptics";
import { useCarouselWithProgress } from "@/hooks/useCarouselWithProgress";
import { CarouselDots } from "./CarouselDots";
import { useKitPackages, useKitSoups, useKitJuices } from "@/hooks/useMenuData";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import KitFlavorSelectionModal from "./KitFlavorSelectionModal";

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

// Default fallback data
const defaultKits: Kit[] = [
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

interface SopaDisplay {
  emoji: string;
  nome: string;
  ingredientes: string;
  beneficio: string;
}

interface SucoDisplay {
  emoji: string;
  nome: string;
  ingredientes: string;
  beneficio: string;
}

const KitsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { addItem } = useCart();
  const [quizOpen, setQuizOpen] = useState(false);
  const [loadingKit, setLoadingKit] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [flavorModalOpen, setFlavorModalOpen] = useState(false);

  // Fetch data from database
  const { data: kitsData } = useKitPackages();
  const { data: soupsData } = useKitSoups();
  const { data: juicesData } = useKitJuices();

  // Transform database data to component format
  const kits = useMemo<Kit[]>(() => {
    if (!kitsData || kitsData.length === 0) return defaultKits;
    
    return kitsData.map(kit => ({
      id: `${kit.days}-dias`,
      name: kit.name,
      days: kit.days,
      price: Number(kit.price),
      pricePerDay: Number(kit.price) / kit.days,
      description: kit.description || "",
      features: kit.features || [],
      popular: kit.popular,
    }));
  }, [kitsData]);

  const sopas = useMemo<SopaDisplay[]>(() => {
    if (!soupsData || soupsData.length === 0) {
      return [
        { emoji: "🟠", nome: "Abóbora termogênica", ingredientes: "com gengibre", beneficio: "termogênico" },
        { emoji: "⚪", nome: "Aipim cremoso", ingredientes: "com alho-poró", beneficio: "digestivo" },
        { emoji: "🟢", nome: "Batata-doce", ingredientes: "com couve e chuchu", beneficio: "energético" },
      ];
    }
    
    return soupsData.map(s => ({
      emoji: s.emoji,
      nome: s.name,
      ingredientes: s.ingredients || "",
      beneficio: s.benefit || "",
    }));
  }, [soupsData]);

  const sucos = useMemo<SucoDisplay[]>(() => {
    if (!juicesData || juicesData.length === 0) {
      return [
        { emoji: "🟢", nome: "Verde", ingredientes: "abacaxi, couve e gengibre", beneficio: "detox" },
        { emoji: "🩷", nome: "Rosa", ingredientes: "melancia com hortelã", beneficio: "hidratante" },
        { emoji: "🟡", nome: "Amarelo", ingredientes: "manga com cenoura", beneficio: "antioxidante" },
        { emoji: "🔴", nome: "Vermelho", ingredientes: "morango com hortelã", beneficio: "vitamina C" },
      ];
    }
    
    return juicesData.map(j => ({
      emoji: j.emoji,
      nome: j.name,
      ingredientes: j.ingredients || "",
      beneficio: j.benefit || "",
    }));
  }, [juicesData]);

  // Prepare flavor data for modal with stock info
  const juiceFlavorsData = useMemo(() => {
    if (!juicesData || juicesData.length === 0) return undefined;
    return juicesData.map(j => ({
      emoji: j.emoji,
      name: j.name,
      description: j.ingredients || "",
      stock_quantity: j.stock_quantity,
      show_stock: j.show_stock,
    }));
  }, [juicesData]);

  const soupFlavorsData = useMemo(() => {
    if (!soupsData || soupsData.length === 0) return undefined;
    return soupsData.map(s => ({
      emoji: s.emoji,
      name: `Sopa de ${s.name}`,
      description: s.ingredients || "",
      stock_quantity: s.stock_quantity,
      show_stock: s.show_stock,
    }));
  }, [soupsData]);

  // Calculate quantities based on kit days
  const getKitQuantities = (days: number) => ({
    juices: days * 4,  // 4 juices per day
    soups: days * 2,   // 2 soups per day
  });

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
    setSelectedKit(kit);
    setFlavorModalOpen(true);
  };

  const handleFlavorConfirm = async (juiceFlavors: FlavorSelection[], soupFlavors: FlavorSelection[]) => {
    if (!selectedKit) return;
    
    setLoadingKit(selectedKit.id);
    
    // Simulate brief loading for feedback
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Combine both flavor arrays
    const allFlavors = [...juiceFlavors, ...soupFlavors];
    
    addItem({
      type: "kit",
      name: selectedKit.name,
      quantity: 1,
      unitPrice: selectedKit.price,
      totalPrice: selectedKit.price,
      description: `${selectedKit.days} dias de detox completo`,
      flavors: allFlavors,
    });

    // Haptic feedback on mobile
    hapticFeedback('success');

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: selectedKit.name,
    });
    
    setLoadingKit(null);
    setFlavorModalOpen(false);
    setSelectedKit(null);
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
              align: "start",
              loop: true,
            }}
            plugins={[autoplayPlugin]}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {kits.map((kit, index) => (
                <CarouselItem key={kit.id} className="pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3">
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
                      disabled={loadingKit === kit.id}
                    >
                      {loadingKit === kit.id ? (
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

          {/* Sabores Section - Collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8"
          >
            {/* Preview de sabores populares */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Destaques:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage-light/50 rounded-full text-xs">
                🟢 Suco Verde
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage-light/50 rounded-full text-xs">
                🟠 Sopa de Abóbora
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage-light/50 rounded-full text-xs">
                🩷 Suco Rosa
              </span>
            </div>

            <Collapsible open={menuOpen} onOpenChange={setMenuOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full bg-gradient-to-r from-sage-light to-sage-light/50 hover:from-sage-light/80 hover:to-sage-light/30 border border-primary/20 rounded-xl p-4 flex items-center justify-between transition-all duration-300 group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🍲🧃</span>
                    <div className="text-left">
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        Ver cardápio completo
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {sopas.length} sopas + {sucos.length} sucos funcionais
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-primary transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="bg-background border border-border border-t-0 rounded-b-xl p-3 sm:p-4 md:p-5 -mt-2 pt-5">
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    {/* Sopas */}
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2 text-sm">
                        🍲 Sopas Funcionais
                        <span className="text-xs font-normal text-muted-foreground">({sopas.length} sabores)</span>
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
                        <span className="text-xs font-normal text-muted-foreground">({sucos.length} sabores)</span>
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
              </CollapsibleContent>
            </Collapsible>
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
              className="gap-1.5 sm:gap-2 border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary animate-[pulse_2s_ease-in-out_infinite] hover:animate-none shadow-[0_0_15px_hsl(var(--primary)/0.3)] text-xs sm:text-sm md:text-base px-2 sm:px-4 md:px-6"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-bounce flex-shrink-0" />
              <span className="sm:hidden">Qual kit ideal?</span>
              <span className="hidden sm:inline">Não sabe qual escolher? Descubra o kit ideal</span>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <SalesQuizModal open={quizOpen} onOpenChange={setQuizOpen} />
      
      {/* Kit Flavor Selection Modal */}
      {selectedKit && (
        <KitFlavorSelectionModal
          isOpen={flavorModalOpen}
          onClose={() => {
            setFlavorModalOpen(false);
            setSelectedKit(null);
          }}
          onConfirm={handleFlavorConfirm}
          kitName={selectedKit.name}
          juiceQuantity={getKitQuantities(selectedKit.days).juices}
          soupQuantity={getKitQuantities(selectedKit.days).soups}
          isLoading={loadingKit === selectedKit.id}
          juiceFlavorsData={juiceFlavorsData}
          soupFlavorsData={soupFlavorsData}
        />
      )}
    </section>
  );
};

export default KitsSection;
export type { Kit };
