import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, Loader2, Beef, Drumstick, Utensils, Sparkles, Scale, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCart, FlavorSelection } from "./CartContext";
import { toast } from "@/hooks/use-toast";
import { hapticFeedback } from "@/lib/haptics";
import { useCarouselWithProgress } from "@/hooks/useCarouselWithProgress";
import { CarouselDots } from "./CarouselDots";
import FlavorSelectionModal from "./FlavorSelectionModal";
import { useMarmitaPackages, useMarmitaFlavors } from "@/hooks/useMenuData";
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

// Map for package images
const packageImages: Record<number, string> = {
  7: marmita1,
  14: marmita2,
  28: marmita3,
};

// Default fallback data
const defaultMarmitas: Marmita[] = [
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
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { addItem } = useCart();
  const [loadingMarmita, setLoadingMarmita] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMarmita, setSelectedMarmita] = useState<Marmita | null>(null);
  const [isFlavorModalOpen, setIsFlavorModalOpen] = useState(false);

  // Fetch data from database
  const { data: packagesData } = useMarmitaPackages();
  const { data: flavorsData } = useMarmitaFlavors();

  // Transform database data to component format
  const marmitas = useMemo<Marmita[]>(() => {
    if (!packagesData || packagesData.length === 0) return defaultMarmitas;
    
    return packagesData.map(pkg => ({
      id: `${pkg.quantity}-marmitas`,
      name: pkg.name,
      quantity: pkg.quantity,
      unitPrice: Number(pkg.unit_price),
      totalPrice: Number(pkg.unit_price) * pkg.quantity,
      image: pkg.image_url || packageImages[pkg.quantity] || marmita1,
      popular: pkg.popular,
    }));
  }, [packagesData]);

  // Group flavors by category for modal
  const flavorsByCategory = useMemo(() => {
    if (!flavorsData || flavorsData.length === 0) return undefined;
    
    const categories = ['carnes', 'frangos', 'massas', 'especiais'];
    return categories.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      flavors: flavorsData.filter(f => f.category === cat).map(f => f.name),
    })).filter(cat => cat.flavors.length > 0);
  }, [flavorsData]);

  // Extract stock data for modal
  const flavorStockData = useMemo(() => {
    if (!flavorsData) return [];
    return flavorsData.map(f => ({
      name: f.name,
      stock_quantity: f.stock_quantity,
      show_stock: f.show_stock,
      low_stock_threshold: f.low_stock_threshold,
    }));
  }, [flavorsData]);

  // Group flavors by category for display
  const saboresCarnes = useMemo(() => 
    flavorsData?.filter(f => f.category === 'carnes').map(f => f.name) || [], [flavorsData]);
  const saboresFrangos = useMemo(() => 
    flavorsData?.filter(f => f.category === 'frangos').map(f => f.name) || [], [flavorsData]);
  const saboresMassas = useMemo(() => 
    flavorsData?.filter(f => f.category === 'massas').map(f => f.name) || [], [flavorsData]);
  const saboresEspeciais = useMemo(() => 
    flavorsData?.filter(f => f.category === 'especiais').map(f => f.name) || [], [flavorsData]);

  const totalFlavors = saboresCarnes.length + saboresFrangos.length + saboresMassas.length + saboresEspeciais.length;

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

  const handleOpenFlavorModal = (marmita: Marmita) => {
    setSelectedMarmita(marmita);
    setIsFlavorModalOpen(true);
  };

  const handleConfirmFlavors = async (flavors: FlavorSelection[]) => {
    if (!selectedMarmita) return;
    
    setLoadingMarmita(selectedMarmita.id);
    
    // Simulate brief loading for feedback
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addItem({
      type: "marmita",
      name: selectedMarmita.name,
      quantity: selectedMarmita.quantity,
      unitPrice: selectedMarmita.unitPrice,
      totalPrice: selectedMarmita.totalPrice,
      description: `${selectedMarmita.quantity} marmitas saudáveis`,
      flavors: flavors,
    });

    // Haptic feedback on mobile
    hapticFeedback('success');

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: `${selectedMarmita.name} (${selectedMarmita.quantity} marmitas)`,
    });
    
    setLoadingMarmita(null);
    setIsFlavorModalOpen(false);
    setSelectedMarmita(null);
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
            Pronto em 3 minutos no micro-ondas. <strong>{totalFlavors || 36} sabores</strong> para você escolher!
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
                    {/* Badges container - empilhados no canto superior direito */}
                    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                      {/* Badge 300g - sempre visível, em cima */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sage/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                        <Scale className="w-3 h-3" />
                        300g
                      </span>
                      
                      {/* Badge Melhor Custo-Benefício - só nos populares, abaixo */}
                      {marmita.popular && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-terracotta text-white text-xs font-bold rounded-full">
                          💚 Melhor Custo-Benefício
                        </span>
                      )}
                    </div>

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
                        onClick={() => handleOpenFlavorModal(marmita)}
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
                            Escolher sabores
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

        {/* Seção de Sabores - Collapsible */}
        <motion.div
          className="mt-12 md:mt-16 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {/* Preview de sabores populares */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Mais pedidos:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-terracotta-light/50 rounded-full text-xs">
              🥩 Estrogonofe de Carne
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-terracotta-light/50 rounded-full text-xs">
              🍗 Frango Xadrez
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-terracotta-light/50 rounded-full text-xs">
              ✨ Escondidinho
            </span>
          </div>

          <Collapsible open={menuOpen} onOpenChange={setMenuOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full bg-gradient-to-r from-terracotta-light to-terracotta-light/50 hover:from-terracotta-light/80 hover:to-terracotta-light/30 border border-terracotta/20 rounded-xl p-4 flex items-center justify-between transition-all duration-300 group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🥩🍗🍝✨</span>
                  <div className="text-left">
                    <span className="font-semibold text-foreground text-sm sm:text-base">
                      Ver cardápio completo
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      36 sabores • 300g cada
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-terracotta transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="bg-card border border-border border-t-0 rounded-b-xl p-4 md:p-6 -mt-2 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Carnes */}
                  <div className="bg-background rounded-xl p-4 md:p-5 border border-border">
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
                  <div className="bg-background rounded-xl p-4 md:p-5 border border-border">
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
                  <div className="bg-background rounded-xl p-4 md:p-5 border border-border">
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
                  <div className="bg-background rounded-xl p-4 md:p-5 border border-border">
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

        {/* Modal de seleção de sabores */}
        <FlavorSelectionModal
          isOpen={isFlavorModalOpen}
          onClose={() => {
            setIsFlavorModalOpen(false);
            setSelectedMarmita(null);
          }}
          onConfirm={handleConfirmFlavors}
          packageName={selectedMarmita?.name || ""}
          packageQuantity={selectedMarmita?.quantity || 0}
          isLoading={loadingMarmita !== null}
          flavorsByCategory={flavorsByCategory}
          flavorStockData={flavorStockData}
        />
      </div>
    </section>
  );
};

export default MarmitasSection;
