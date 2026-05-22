import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, Loader2, Beef, Drumstick, Utensils, Sparkles, Scale, ChevronDown, Dumbbell } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCart, FlavorSelection } from "./CartContext";
import { toast } from "@/hooks/use-toast";
import { hapticFeedback } from "@/lib/haptics";
import { useCarouselWithProgress } from "@/hooks/useCarouselWithProgress";
import { CarouselDots } from "./CarouselDots";
import FlavorSelectionModal from "./FlavorSelectionModal";
import type { PricingTier } from "./FlavorSelectionModal";
import { useMarmitaEmagrecimento, useMarmitaHipertrofia, useMarmitaFlavors, MarmitaPackage } from "@/hooks/useMenuData";
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
  popular: boolean;
  weight: number;
  lineType: string;
}

// Map for package images (same for both lines until specific photos are added)
const packageImages: Record<number, string> = {
  7: marmita1,
  14: marmita2,
  21: marmita2,
  28: marmita3,
};

// Transform DB package to component format
const transformPackage = (pkg: MarmitaPackage): Marmita => ({
  id: `${pkg.line_type}-${pkg.quantity}-marmitas`,
  name: pkg.name,
  quantity: pkg.quantity,
  unitPrice: Number(pkg.unit_price),
  totalPrice: Number(pkg.unit_price) * pkg.quantity,
  image: pkg.image_url || packageImages[pkg.quantity] || marmita1,
  popular: pkg.popular,
  weight: pkg.weight,
  lineType: pkg.line_type,
});

// Carousel component for a line of marmitas
interface MarmitaCarouselProps {
  marmitas: Marmita[];
  lineType: 'emagrecimento' | 'hipertrofia';
  onOpenFlavorModal: (marmita: Marmita) => void;
  loadingMarmita: string | null;
  isInView: boolean;
  minFlavorOverride?: number;
  minUnitPriceByQuantity?: Record<number, number>;
}

const MarmitaCarousel = ({ marmitas, lineType, onOpenFlavorModal, loadingMarmita, isInView, minFlavorOverride, minUnitPriceByQuantity }: MarmitaCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const {
    api,
    setApi,
    current,
    count,
    progress,
    autoplayPlugin,
    setIsHoveringDots,
  } = useCarouselWithProgress(carouselRef as any, { autoplayDelay: 4000 });

  const isHipertrofia = lineType === 'hipertrofia';
  const badgeColor = isHipertrofia ? 'bg-blue-600' : 'bg-sage';
  const accentColor = isHipertrofia ? 'text-blue-600' : 'text-terracotta';
  const bgGradient = isHipertrofia 
    ? 'from-blue-100 to-card border-blue-500' 
    : 'from-terracotta-light to-card border-terracotta';

  return (
    <div ref={carouselRef}>
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
                    ? `bg-gradient-to-br ${bgGradient} border-2 shadow-card`
                    : "bg-card border border-border hover:border-terracotta/30 hover:shadow-soft"
                } ${
                  isHipertrofia 
                    ? 'ring-2 ring-blue-400/60 shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:shadow-[0_0_28px_rgba(59,130,246,0.5)]' 
                    : ''
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Badges container */}
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                  {/* Weight badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${badgeColor} text-white text-xs font-bold rounded-full backdrop-blur-sm`}>
                    <Scale className="w-3 h-3" />
                    {marmita.weight}g
                  </span>
                  
                  {/* Popular badge */}
                  {marmita.popular && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 ${isHipertrofia ? 'bg-blue-600' : 'bg-terracotta'} text-white text-xs font-bold rounded-full`}>
                      {isHipertrofia ? '💪' : '💚'} Melhor Custo-Benefício
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
                    Marmitas de {marmita.weight}g
                  </p>

                  {(() => {
                    const minUnit = minUnitPriceByQuantity?.[marmita.quantity] ?? marmita.unitPrice;
                    const effectiveUnit = Math.min(minUnit, marmita.unitPrice);
                    const hasOffer = effectiveUnit < marmita.unitPrice;
                    return (
                      <>
                        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mb-1">
                          <span className="text-xs text-muted-foreground">a partir de</span>
                          {hasOffer && (
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {marmita.unitPrice.toFixed(2).replace(".", ",")}
                            </span>
                          )}
                          <span className={`text-xl sm:text-2xl font-bold ${accentColor}`}>
                            R$ {effectiveUnit.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">cada</span>
                          {hasOffer && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-terracotta text-white rounded-full">
                              OFERTA
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                          <Clock className="w-4 h-4" />
                          <span>A partir de R$ {(marmita.quantity * effectiveUnit).toFixed(2).replace(".", ",")}</span>
                        </div>
                      </>
                    );
                  })()}


                  <Button
                    variant={marmita.popular ? "cta" : "cta-outline"}
                    className={`w-full ${isHipertrofia && marmita.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    onClick={() => onOpenFlavorModal(marmita)}
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
        activeColor={isHipertrofia ? "bg-blue-600" : "bg-terracotta"}
      />
    </div>
  );
};

const MarmitasSection = () => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { addItem } = useCart();
  const [loadingMarmita, setLoadingMarmita] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMarmita, setSelectedMarmita] = useState<Marmita | null>(null);
  const [isFlavorModalOpen, setIsFlavorModalOpen] = useState(false);

  // Fetch data from database - separate hooks for each line
  const { data: emagrecimentoData } = useMarmitaEmagrecimento();
  const { data: hipertrofiaData } = useMarmitaHipertrofia();
  const { data: flavorsData } = useMarmitaFlavors();

  // Transform database data to component format
  const marmitasEmagrecimento = useMemo<Marmita[]>(() => {
    if (!emagrecimentoData || emagrecimentoData.length === 0) return [];
    return emagrecimentoData.map(transformPackage);
  }, [emagrecimentoData]);

  const marmitasHipertrofia = useMemo<Marmita[]>(() => {
    if (!hipertrofiaData || hipertrofiaData.length === 0) return [];
    return hipertrofiaData.map(transformPackage);
  }, [hipertrofiaData]);

  // Compute minimum flavor price per line (considers flat overrides AND tier prices)
  const collectFlavorPrices = (
    field: 'price_override_fit' | 'price_override_fitness',
    tierField: 'price_tiers_fit' | 'price_tiers_fitness',
  ): number[] => {
    if (!flavorsData) return [];
    const prices: number[] = [];
    for (const f of flavorsData) {
      const flat = (f as any)[field];
      if (typeof flat === 'number' && flat > 0) prices.push(flat);
      const tiers = (f as any)[tierField];
      if (tiers && typeof tiers === 'object') {
        for (const v of Object.values(tiers)) {
          const n = Number(v);
          if (!isNaN(n) && n > 0) prices.push(n);
        }
      }
    }
    return prices;
  };

  const minFlavorOverrideFit = useMemo(() => {
    const prices = collectFlavorPrices('price_override_fit', 'price_tiers_fit');
    return prices.length > 0 ? Math.min(...prices) : undefined;
  }, [flavorsData]);

  const minFlavorOverrideFitness = useMemo(() => {
    const prices = collectFlavorPrices('price_override_fitness', 'price_tiers_fitness');
    return prices.length > 0 ? Math.min(...prices) : undefined;
  }, [flavorsData]);

  // Compute min unit price per quantity (considers tier for that quantity + flat override)
  const computeMinByQuantity = (
    packages: Marmita[],
    field: 'price_override_fit' | 'price_override_fitness',
    tierField: 'price_tiers_fit' | 'price_tiers_fitness',
  ): Record<number, number> => {
    const result: Record<number, number> = {};
    if (!flavorsData) return result;
    for (const pkg of packages) {
      let min = pkg.unitPrice;
      for (const f of flavorsData) {
        const tiers = (f as any)[tierField];
        const tierVal = tiers && typeof tiers === 'object' ? Number(tiers[String(pkg.quantity)] ?? tiers[pkg.quantity]) : NaN;
        const flat = Number((f as any)[field]);
        const candidate = !isNaN(tierVal) && tierVal > 0
          ? tierVal
          : (!isNaN(flat) && flat > 0 ? flat : pkg.unitPrice);
        if (candidate < min) min = candidate;
      }
      result[pkg.quantity] = min;
    }
    return result;
  };

  const minUnitByQuantityFit = useMemo(
    () => computeMinByQuantity(marmitasEmagrecimento, 'price_override_fit', 'price_tiers_fit'),
    [flavorsData, marmitasEmagrecimento]
  );
  const minUnitByQuantityFitness = useMemo(
    () => computeMinByQuantity(marmitasHipertrofia, 'price_override_fitness', 'price_tiers_fitness'),
    [flavorsData, marmitasHipertrofia]
  );


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
      sides: f.sides,
      price_override_fit: f.price_override_fit,
      price_override_fitness: f.price_override_fitness,
      price_tiers_fit: f.price_tiers_fit as any,
      price_tiers_fitness: f.price_tiers_fitness as any,
    }));
  }, [flavorsData]);

  // Build pricing tiers from packages for progressive discount
  const pricingTiersForLine = useMemo(() => {
    return (packages: Marmita[]): PricingTier[] => {
      if (!packages || packages.length === 0) return [];
      return packages
        .map(p => ({ minQuantity: p.quantity, unitPrice: p.unitPrice }))
        .sort((a, b) => a.minQuantity - b.minQuantity);
    };
  }, []);

  const emagrecimentoTiers = useMemo(() => pricingTiersForLine(marmitasEmagrecimento), [marmitasEmagrecimento, pricingTiersForLine]);
  const hipertrofiaTiers = useMemo(() => pricingTiersForLine(marmitasHipertrofia), [marmitasHipertrofia, pricingTiersForLine]);
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

  const handleOpenFlavorModal = (marmita: Marmita) => {
    setSelectedMarmita(marmita);
    setIsFlavorModalOpen(true);
  };

  const handleConfirmFlavors = async (flavors: FlavorSelection[], fishAdditional: number, totalQuantity: number, calculatedTotal: number) => {
    if (!selectedMarmita) return;
    
    setLoadingMarmita(selectedMarmita.id);
    
    // Simulate brief loading for feedback
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addItem({
      type: "marmita",
      name: selectedMarmita.name,
      quantity: 1,
      unitPrice: calculatedTotal,
      totalPrice: calculatedTotal,
      description: `${totalQuantity} marmitas de ${selectedMarmita.weight}g`,
      flavors: flavors,
      fishAdditional: fishAdditional,
      lineType: selectedMarmita.lineType,
    });

    // Haptic feedback on mobile
    hapticFeedback('success');

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: `${selectedMarmita.name} (${totalQuantity} marmitas de ${selectedMarmita.weight}g)`,
    });
    
    setLoadingMarmita(null);
    setIsFlavorModalOpen(false);
    setSelectedMarmita(null);
  };

  return (
    <section ref={ref} id="marmitas" className="py-12 md:py-20 lg:py-28 bg-background">
      <div className="container px-4 md:px-6">
        {/* SEÇÃO 1: Emagrecimento 300g */}
        {marmitasEmagrecimento.length > 0 && (
          <div id="marmitas-fit" className="mb-16 md:mb-24">
            <motion.div
              className="text-center mb-8 md:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-3 sm:px-4 py-1.5 bg-terracotta-light text-terracotta text-xs sm:text-sm font-medium rounded-full mb-4">
                🥗 Emagrecimento & Definição
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                Marmitas Dia a Dia <span className="text-sage">300g</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Saudável, leve e com variedade no prato! <strong>{totalFlavors || 36} sabores</strong> para você escolher.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-4xl mx-auto"
            >
              <MarmitaCarousel
                marmitas={marmitasEmagrecimento}
                lineType="emagrecimento"
                onOpenFlavorModal={handleOpenFlavorModal}
                loadingMarmita={loadingMarmita}
                isInView={isInView}
                minFlavorOverride={minFlavorOverrideFit}
              />
            </motion.div>
          </div>
        )}

        {/* SEÇÃO 2: Hipertrofia 450g */}
        {marmitasHipertrofia.length > 0 && (
          <div id="marmitas-fitness" className="mb-12 md:mb-16">
            <motion.div
              className="text-center mb-8 md:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="inline-block px-3 sm:px-4 py-1.5 bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium rounded-full mb-4">
                💪 FITNESS - Hipertrofia
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                Marmitas FITNESS <span className="text-blue-600">450g</span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                <strong>150g de proteína + 200g de carbo + 100g de mix vegetal.</strong> Nutrição pra quem treina pesado!
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <MarmitaCarousel
                marmitas={marmitasHipertrofia}
                lineType="hipertrofia"
                onOpenFlavorModal={handleOpenFlavorModal}
                loadingMarmita={loadingMarmita}
                isInView={isInView}
                minFlavorOverride={minFlavorOverrideFitness}
              />
            </motion.div>
          </div>
        )}

        {/* Seção de Sabores - Collapsible */}
        <motion.div
          className="mt-12 md:mt-16 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
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
                      {totalFlavors || 36} sabores disponíveis
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
      </div>

      {/* Flavor Selection Modal */}
      <FlavorSelectionModal
        isOpen={isFlavorModalOpen}
        onClose={() => {
          setIsFlavorModalOpen(false);
          setSelectedMarmita(null);
        }}
        onConfirm={handleConfirmFlavors}
        packageName={selectedMarmita?.name || ""}
        packageQuantity={selectedMarmita?.quantity || 7}
        packageUnitPrice={selectedMarmita?.unitPrice || 0}
        packageWeight={selectedMarmita?.weight || 300}
        lineType={selectedMarmita?.lineType}
        isLoading={loadingMarmita !== null}
        flavorsByCategory={flavorsByCategory}
        flavorStockData={flavorStockData}
        pricingTiers={selectedMarmita?.lineType === 'hipertrofia' ? hipertrofiaTiers : emagrecimentoTiers}
      />
    </section>
  );
};

export default MarmitasSection;
