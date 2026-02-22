import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShoppingCart, Minus, Plus, Beef, Drumstick, Utensils, Sparkles, Check, AlertCircle, Fish, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { celebrateCheckout } from "@/lib/confetti";
import { hapticFeedback } from "@/lib/haptics";
import { getFlavorDescription, mapLineTypeToKey } from "@/lib/flavor-description";

interface FlavorSelection {
  name: string;
  quantity: number;
  category: string;
}

interface FlavorCategory {
  id: string;
  name: string;
  flavors: string[];
}

interface FlavorData {
  name: string;
  stock_quantity: number | null;
  show_stock: boolean;
  low_stock_threshold: number | null;
  sides?: any;
  price_override_fit?: number | null;
  price_override_fitness?: number | null;
}

export interface PricingTier {
  minQuantity: number;
  unitPrice: number;
}

interface FlavorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (flavors: FlavorSelection[], fishAdditional: number, totalQuantity: number, calculatedTotal: number) => void;
  packageName: string;
  packageQuantity: number;
  packageUnitPrice: number;
  packageWeight?: number;
  lineType?: string;
  isLoading?: boolean;
  flavorsByCategory?: FlavorCategory[];
  flavorStockData?: FlavorData[];
  pricingTiers?: PricingTier[];
}

// Fish flavor name and surcharge
const FISH_FLAVOR_NAME = "Filé de peixe com alecrim e arroz";
const FISH_SURCHARGE = 4.99;

// Calculate max flavors based on package quantity
const getMaxFlavors = (quantity: number): number => {
  if (quantity <= 7) return 3;
  if (quantity <= 14) return 7;
  if (quantity <= 21) return 10;
  return 14;
};

// Default fallback flavors
const defaultFlavorCategories: FlavorCategory[] = [
  {
    id: "carnes",
    name: "Carnes",
    flavors: [
      "Almôndegas com Espaguete",
      "Carne Desfiada com Arroz à Grega e Purê de Abóbora",
      "Carne Moída com Arroz Branco e Feijão Carioca",
      "Estrogonofe de Carne com Arroz Branco",
    ],
  },
  {
    id: "frangos",
    name: "Frangos",
    flavors: [
      "Estrogonofe de Frango com Arroz Branco",
      "Frango Xadrez com Arroz Integral e Legumes",
      "Frango à Parmegiana com Purê de Batata",
    ],
  },
  {
    id: "massas",
    name: "Massas",
    flavors: [
      "Espaguete Integral com Carne",
      "Macarronada à Bolonhesa",
    ],
  },
  {
    id: "especiais",
    name: "Especiais",
    flavors: [
      "Escondidinho de Batata Inglesa com Carne Desfiada",
      "Feijoada Light com Arroz Branco e Couve",
    ],
  },
];

const categoryIcons: Record<string, { icon: any; color: string }> = {
  carnes: { icon: Beef, color: "red" },
  frangos: { icon: Drumstick, color: "amber" },
  massas: { icon: Utensils, color: "orange" },
  especiais: { icon: Sparkles, color: "purple" },
};

const FlavorSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  packageName,
  packageQuantity,
  packageUnitPrice,
  packageWeight = 300,
  lineType = 'emagrecimento',
  isLoading = false,
  flavorsByCategory,
  flavorStockData = [],
  pricingTiers = [],
}: FlavorSelectionModalProps) => {
  const navigate = useNavigate();
  const lineKey = mapLineTypeToKey(lineType);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [leaveToUs, setLeaveToUs] = useState(false);
  const [celebrationInfo, setCelebrationInfo] = useState<{ discount: number } | null>(null);
  const prevTierPriceRef = useRef<number | null>(null);

  const flavorCategories = flavorsByCategory || defaultFlavorCategories;
  const maxFlavors = getMaxFlavors(packageQuantity);

  // Sort tiers ascending by minQuantity for tier lookup
  const sortedTiers = useMemo(() => 
    [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity),
    [pricingTiers]
  );

  // Get the effective base price for a given quantity based on tiers
  const getEffectiveBasePrice = (qty: number): number => {
    if (sortedTiers.length === 0) return packageUnitPrice;
    let price = packageUnitPrice;
    for (const tier of sortedTiers) {
      if (qty >= tier.minQuantity) {
        price = tier.unitPrice;
      }
    }
    return price;
  };

  const getFlavorStock = (flavorName: string): FlavorData | undefined => {
    return flavorStockData.find(f => f.name === flavorName);
  };

  // Get the unit price for a specific flavor, considering tier-based base price
  const getFlavorPrice = (flavorName: string, effectiveBase: number): number => {
    const stockData = getFlavorStock(flavorName);
    if (!stockData) return effectiveBase;
    const override = lineType === 'hipertrofia' 
      ? stockData.price_override_fitness 
      : stockData.price_override_fit;
    return override ?? effectiveBase;
  };

  const totalSelected = useMemo(() => {
    return Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  }, [selections]);

  const uniqueFlavorsCount = useMemo(() => {
    return Object.values(selections).filter(qty => qty > 0).length;
  }, [selections]);

  // Effective base price based on current total quantity (tier pricing)
  const effectiveBasePrice = useMemo(() => 
    getEffectiveBasePrice(totalSelected),
    [totalSelected, sortedTiers, packageUnitPrice]
  );

  // Next pricing tier info for nudge (must offer a lower price than current)
  const nextTier = useMemo(() => {
    if (sortedTiers.length === 0) return null;
    const currentPrice = getEffectiveBasePrice(totalSelected);
    const next = sortedTiers.find(t => t.minQuantity > totalSelected && t.unitPrice < currentPrice);
    if (!next) return null;
    const unitsNeeded = next.minQuantity - totalSelected;
    const totalAtNextTier = next.minQuantity;
    const savingPerUnit = currentPrice - next.unitPrice;
    const totalSaving = savingPerUnit * totalAtNextTier;
    return { unitsNeeded, unitPrice: next.unitPrice, minQuantity: next.minQuantity, totalSaving };
  }, [totalSelected, sortedTiers, packageUnitPrice]);

  // Calculate dynamic total based on per-flavor prices with tier pricing
  const calculatedTotal = useMemo(() => {
    const basePrice = getEffectiveBasePrice(totalSelected);
    return Object.entries(selections).reduce((sum, [flavor, qty]) => {
      const price = getFlavorPrice(flavor, basePrice);
      const isFish = flavor === FISH_FLAVOR_NAME;
      return sum + qty * price + (isFish ? qty * FISH_SURCHARGE : 0);
    }, 0);
  }, [selections, flavorStockData, totalSelected, sortedTiers, packageUnitPrice, lineType]);

  const fishQuantity = useMemo(() => {
    return selections[FISH_FLAVOR_NAME] || 0;
  }, [selections]);
  const fishAdditional = fishQuantity * FISH_SURCHARGE;

  const remaining = packageQuantity - totalSelected;
  const isComplete = (totalSelected >= packageQuantity && uniqueFlavorsCount <= maxFlavors) || 
                     (totalSelected >= 1 && totalSelected >= packageQuantity) || 
                     leaveToUs;
  const hasMinimum = totalSelected >= packageQuantity;
  const extraCount = Math.max(0, totalSelected - packageQuantity);
  
  // Variety limit: only enforced within base package quantity
  // Once over package quantity, variety limit is lifted
  const isMaxFlavorsReached = totalSelected < packageQuantity && uniqueFlavorsCount >= maxFlavors;

  const prevMaxReachedRef = useRef(false);

  // Calculate total accumulated discount vs the highest (worst) tier price
  const totalAccumulatedDiscount = useMemo(() => {
    if (sortedTiers.length === 0 || totalSelected < packageQuantity) return 0;
    const worstPrice = sortedTiers[0]?.unitPrice ?? packageUnitPrice;
    const currentPrice = getEffectiveBasePrice(totalSelected);
    if (currentPrice >= worstPrice) return 0;
    return (worstPrice - currentPrice) * totalSelected;
  }, [totalSelected, sortedTiers, packageUnitPrice, packageQuantity]);

  // Detect tier crossing for celebration
  useEffect(() => {
    if (sortedTiers.length === 0 || totalSelected === 0) {
      prevTierPriceRef.current = null;
      setCelebrationInfo(null);
      return;
    }
    const currentTierPrice = getEffectiveBasePrice(totalSelected);
    const prevPrice = prevTierPriceRef.current;
    const tiersReached = sortedTiers.filter(t => totalSelected >= t.minQuantity).length;
    
    if (prevPrice !== null && tiersReached >= 1) {
      if (currentTierPrice < prevPrice) {
        // Crossing UP - show total accumulated discount
        const worstPrice = sortedTiers[0]?.unitPrice ?? packageUnitPrice;
        const discount = (worstPrice - currentTierPrice) * totalSelected;
        setCelebrationInfo({ discount });
        celebrateCheckout();
        hapticFeedback('success');
        const timer = setTimeout(() => setCelebrationInfo(null), 4000);
        prevTierPriceRef.current = currentTierPrice;
        return () => clearTimeout(timer);
      }
      if (totalSelected === packageQuantity && prevPrice === currentTierPrice && !celebrationInfo) {
        const preTierPrice = getEffectiveBasePrice(packageQuantity - 1);
        if (preTierPrice > currentTierPrice) {
          const discount = (preTierPrice - currentTierPrice) * totalSelected;
          setCelebrationInfo({ discount });
          celebrateCheckout();
          hapticFeedback('success');
          const timer = setTimeout(() => setCelebrationInfo(null), 4000);
          prevTierPriceRef.current = currentTierPrice;
          return () => clearTimeout(timer);
        }
      }
    }
    
    if (prevPrice !== null && currentTierPrice > prevPrice) {
      setCelebrationInfo(null);
    }
    
    prevTierPriceRef.current = currentTierPrice;
  }, [totalSelected, sortedTiers]);

  // Initialize prevTierPriceRef when modal opens
  useEffect(() => {
    if (isOpen) {
      prevTierPriceRef.current = sortedTiers.length > 0 ? getEffectiveBasePrice(packageQuantity) : null;
      setCelebrationInfo(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isMaxFlavorsReached && !prevMaxReachedRef.current && remaining > 0) {
      hapticFeedback('warning');
    }
    prevMaxReachedRef.current = isMaxFlavorsReached;
  }, [isMaxFlavorsReached, remaining]);

  const updateQuantity = (flavor: string, delta: number) => {
    if (leaveToUs) return;
    
    const stockData = getFlavorStock(flavor);
    const maxStock = (stockData?.show_stock && stockData?.stock_quantity !== null) ? stockData.stock_quantity : Infinity;
    
    setSelections((prev) => {
      const current = prev[flavor] || 0;
      const newValue = current + delta;
      
      if (newValue <= 0) {
        const { [flavor]: _, ...rest } = prev;
        return rest;
      }
      
      if (delta > 0) {
        if (newValue > maxStock) return prev;
        // Block adding NEW flavor if max flavors reached (only within base package quantity)
        const currentTotal = Object.values(prev).reduce((sum, qty) => sum + qty, 0);
        const currentUnique = Object.values(prev).filter(qty => qty > 0).length;
        if (current === 0 && currentTotal < packageQuantity && currentUnique >= maxFlavors) return prev;
      }
      
      return { ...prev, [flavor]: newValue };
    });
  };

  const handleLeaveToUsChange = (checked: boolean) => {
    setLeaveToUs(checked);
    if (checked) {
      setSelections({});
    }
  };

  const handleConfirm = () => {
    celebrateCheckout();
    
    if (leaveToUs) {
      onConfirm([{
        name: "Deixar a cargo da casa",
        quantity: packageQuantity,
        category: "Escolha da casa",
      }], 0, packageQuantity, packageQuantity * packageUnitPrice);
      setSelections({});
      setLeaveToUs(false);
      return;
    }
    
    const flavorsArray: FlavorSelection[] = [];
    
    flavorCategories.forEach((category) => {
      category.flavors.forEach((flavor) => {
        const qty = selections[flavor];
        if (qty && qty > 0) {
          flavorsArray.push({
            name: flavor,
            quantity: qty,
            category: category.name,
          });
        }
      });
    });
    
    onConfirm(flavorsArray, fishAdditional, totalSelected, calculatedTotal);
    setSelections({});
    setLeaveToUs(false);
  };

  const handleClose = () => {
    setSelections({});
    setLeaveToUs(false);
    onClose();
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      red: { bg: "bg-red-100 dark:bg-red-900/30", icon: "text-red-600 dark:text-red-400" },
      amber: { bg: "bg-amber-100 dark:bg-amber-900/30", icon: "text-amber-600 dark:text-amber-400" },
      orange: { bg: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-600 dark:text-orange-400" },
      purple: { bg: "bg-purple-100 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400" },
    };
    return colors[color] || colors.red;
  };

  const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b bg-background shrink-0">
          <DialogTitle className="text-lg font-bold">
            Escolha seus sabores
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {packageName} • mín. {packageQuantity} marmitas de {packageWeight}g
            {sortedTiers.length > 0 && totalSelected > 0 && (
              <span className="ml-1 font-medium text-primary">
                • {formatPrice(effectiveBasePrice)}/un
              </span>
            )}
          </p>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="px-4 py-3 bg-muted/50 border-b shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {leaveToUs ? "Escolha da casa" : `${totalSelected} marmita${totalSelected !== 1 ? 's' : ''} selecionada${totalSelected !== 1 ? 's' : ''}`}
              </span>
              {!leaveToUs && extraCount > 0 && (
                <span className="text-xs text-primary font-medium">
                  📦 {packageQuantity} base + {extraCount} extra{extraCount > 1 ? 's' : ''}
                </span>
              )}
              {!leaveToUs && !hasMinimum && (
                <span className={`text-xs flex items-center gap-1 ${isMaxFlavorsReached ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                  {isMaxFlavorsReached && <AlertCircle className="w-3 h-3" />}
                  {uniqueFlavorsCount} de {maxFlavors} sabores diferentes
                  {isMaxFlavorsReached && " (máximo)"}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <AnimatePresence mode="wait">
                {hasMinimum || leaveToUs ? (
                  <motion.span
                    key="complete"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-1 text-sm text-primary font-medium"
                  >
                    <Check className="w-4 h-4" />
                    {leaveToUs ? "Mix variado" : "Pronto!"}
                  </motion.span>
                ) : (
                  <motion.span
                    key="remaining"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground"
                  >
                    Faltam {remaining}
                  </motion.span>
                )}
              </AnimatePresence>
              {!leaveToUs && totalSelected > 0 && (
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(calculatedTotal)}
                </span>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                hasMinimum ? "bg-primary" : "bg-terracotta"
              }`}
              initial={{ width: 0 }}
              animate={{ width: leaveToUs ? "100%" : `${Math.min((totalSelected / packageQuantity) * 100, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Celebration banner (temporary) */}
          <AnimatePresence>
            {celebrationInfo && !leaveToUs && (
              <motion.div
                key="celebration"
                initial={{ opacity: 0, scale: 0.9, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: "auto" }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="mt-2"
              >
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-sm dark:bg-emerald-900/20 dark:border-emerald-700">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 animate-sparkle-pulse" />
                  <span className="text-emerald-800 dark:text-emerald-200 font-semibold">
                    🎉 Você ganhou {formatPrice(celebrationInfo.discount)} de desconto!
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent accumulated discount badge */}
          <AnimatePresence>
            {!celebrationInfo && totalAccumulatedDiscount > 0 && !leaveToUs && (
              <motion.div
                key="accumulated"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/60 border border-emerald-200 text-sm dark:bg-emerald-900/10 dark:border-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                    Desconto acumulado: <strong>{formatPrice(totalAccumulatedDiscount)}</strong>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progressive discount nudge */}
          <AnimatePresence>
            {nextTier && !leaveToUs && totalSelected >= packageQuantity && (
              <motion.div
                key={`nudge-${nextTier.minQuantity}`}
                initial={{ opacity: 0, scale: 0.95, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: "auto" }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="mt-2"
              >
                <motion.div 
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 border-2 border-primary/30 text-sm shadow-sm"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 shrink-0">
                    <TrendingDown className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground leading-tight">
                    <strong className="text-primary">+{nextTier.unitsNeeded} marmitas</strong> para ganhar{' '}
                    <strong className="text-primary text-base">{formatPrice(nextTier.totalSaving)}</strong> de desconto 🔥
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Alert when max flavors reached but still need to complete base */}
        <AnimatePresence>
          {isMaxFlavorsReached && !leaveToUs && remaining > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-3 shrink-0"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    Limite de variedades atingido!
                  </p>
                  <p className="text-xs mt-0.5 opacity-90">
                    Para o pacote base de {packageQuantity} marmitas, máximo {maxFlavors} sabores diferentes.
                    Aumente a quantidade dos sabores já selecionados para completar.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Leave to us option */}
            <motion.div 
              onClick={() => handleLeaveToUsChange(!leaveToUs)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${
                leaveToUs 
                  ? "border-primary bg-primary/10" 
                  : "border-primary/60 bg-gradient-to-r from-primary/5 to-primary/10 hover:border-primary"
              }`}
            >
              {!leaveToUs && (
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              )}
              
              <div className="absolute -top-0 -right-0">
                <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg uppercase tracking-wide">
                  ⭐ Recomendado
                </div>
              </div>
              
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                leaveToUs ? "border-primary bg-primary" : "border-primary"
              }`}>
                {leaveToUs && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 pr-16">
                <span className="font-semibold text-foreground">
                  🍽️ Deixar a cargo da casa
                </span>
                <p className="text-sm text-muted-foreground">
                  Montamos um mix variado com nossos sabores mais pedidos
                </p>
              </div>
            </motion.div>

            {/* AI option */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onClose();
                navigate(`/monte-seu-cardapio?linha=${lineType === 'hipertrofia' ? 'hipertrofia' : 'emagrecimento'}`);
              }}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 hover:border-purple-400 dark:hover:border-purple-600 cursor-pointer transition-all"
            >
              <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-foreground">
                  ✨ Liste o que gosta e montamos pra você
                </span>
                <p className="text-sm text-muted-foreground">
                  Diga seus ingredientes preferidos e a IA monta seu cardápio
                </p>
              </div>
            </motion.div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou escolha manualmente</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {flavorCategories.map((category) => {
              const iconData = categoryIcons[category.id] || { icon: Sparkles, color: "purple" };
              const Icon = iconData.icon;
              const colorClasses = getColorClasses(iconData.color);
              
              return (
                <div key={category.id} className={`transition-opacity ${leaveToUs ? "opacity-40 pointer-events-none" : ""}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${colorClasses.bg}`}>
                      <Icon className={`w-4 h-4 ${colorClasses.icon}`} />
                    </div>
                    <h4 className="font-semibold text-foreground">{category.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      ({category.flavors.length})
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {category.flavors.map((flavor) => {
                      const qty = selections[flavor] || 0;
                      const isSelected = qty > 0;
                      const stockData = getFlavorStock(flavor);
                      const threshold = stockData?.low_stock_threshold ?? 5;
                      const hasLowStock = stockData?.show_stock && stockData.stock_quantity !== null && stockData.stock_quantity < threshold;
                      const isOutOfStock = stockData?.show_stock && stockData.stock_quantity === 0;
                      const maxReached = stockData?.show_stock && stockData?.stock_quantity !== null && qty >= (stockData?.stock_quantity ?? Infinity);
                      const isFish = flavor === FISH_FLAVOR_NAME;
                      const flavorPrice = getFlavorPrice(flavor, effectiveBasePrice);
                      const hasCustomPrice = flavorPrice !== effectiveBasePrice;
                      
                      // Block adding new flavors if max variety reached and still within base quantity
                      const currentTotal = totalSelected;
                      const cannotAddNewFlavor = !isSelected && currentTotal < packageQuantity && isMaxFlavorsReached;
                      
                      return (
                        <div
                          key={flavor}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isOutOfStock
                              ? "border-destructive/30 bg-destructive/5 opacity-60"
                              : isSelected
                              ? "border-terracotta bg-terracotta-light/30"
                              : "border-border bg-background hover:border-terracotta/30"
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span className={`text-sm ${isSelected ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                              {isFish && <Fish className="w-3.5 h-3.5 inline mr-1 text-blue-500" />}
                              {flavor}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isFish && (
                                <span className="text-xs text-blue-600 font-medium">
                                  (+R$ 4,99/un)
                                </span>
                              )}
                              {(() => {
                                const flavorStock = getFlavorStock(flavor);
                                const desc = flavorStock?.sides ? getFlavorDescription(flavorStock.sides, lineKey) : null;
                                return desc ? (
                                  <span className="text-xs text-muted-foreground leading-tight">
                                    • {desc}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            {hasLowStock && !isOutOfStock && (
                              <span className="text-xs text-destructive font-medium animate-pulse">
                                🔥 Apenas {stockData.stock_quantity} disponíveis
                              </span>
                            )}
                            {isOutOfStock && (
                              <span className="text-xs text-destructive font-medium">
                                Esgotado
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-sm font-bold whitespace-nowrap ${hasCustomPrice ? 'text-primary' : 'text-foreground'}`}>
                              {formatPrice(flavorPrice)}
                            </span>
                            {isSelected && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => updateQuantity(flavor, -1)}
                                className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </motion.button>
                            )}
                            
                            {isSelected && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-6 text-center font-semibold text-sm"
                              >
                                {qty}
                              </motion.span>
                            )}
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => updateQuantity(flavor, 1)}
                                    disabled={isOutOfStock || maxReached || cannotAddNewFlavor}
                                    className={`p-1.5 rounded-full transition-colors ${
                                      isOutOfStock || maxReached || cannotAddNewFlavor
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-terracotta hover:bg-terracotta/90 text-white"
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                {cannotAddNewFlavor && (
                                  <TooltipContent side="left">
                                    <p>Limite de {maxFlavors} sabores diferentes atingido</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background shrink-0 space-y-3">
          {/* Price breakdown */}
          {!leaveToUs && totalSelected > 0 && (
            <div className="space-y-1">
              {extraCount > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>📦 {packageQuantity} marmitas base + {extraCount} extra{extraCount > 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total ({totalSelected} marmita{totalSelected > 1 ? 's' : ''})</span>
                <span className="font-bold text-lg text-foreground">
                  {formatPrice(calculatedTotal)}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="cta"
            className="w-full"
            onClick={handleConfirm}
            disabled={!hasMinimum && !leaveToUs || isLoading}
          >
            {isLoading ? (
              "Adicionando..."
            ) : hasMinimum || leaveToUs ? (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar ao carrinho • {formatPrice(leaveToUs ? packageQuantity * packageUnitPrice : calculatedTotal)}
              </>
            ) : (
              `Selecione mais ${remaining} marmita${remaining > 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlavorSelectionModal;
