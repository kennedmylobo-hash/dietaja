import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, Sparkles, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { celebrateCheckout } from "@/lib/confetti";
import { FlavorSelection } from "./CartContext";

interface FlavorDataWithStock {
  emoji: string;
  name: string;
  description: string;
  stock_quantity?: number | null;
  show_stock?: boolean;
  low_stock_threshold?: number | null;
}

interface KitFlavorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (juiceFlavors: FlavorSelection[], soupFlavors: FlavorSelection[]) => void;
  kitName: string;
  juiceQuantity: number;
  soupQuantity: number;
  isLoading?: boolean;
  initialJuiceFlavors?: FlavorSelection[];
  initialSoupFlavors?: FlavorSelection[];
  juiceFlavorsData?: FlavorDataWithStock[];
  soupFlavorsData?: FlavorDataWithStock[];
}

// Default juice flavors with their info
const defaultJuiceFlavors: FlavorDataWithStock[] = [
  { emoji: "🟢", name: "Suco Verde", description: "abacaxi, couve e gengibre" },
  { emoji: "🩷", name: "Suco Rosa", description: "melancia com hortelã" },
  { emoji: "🟡", name: "Suco Amarelo", description: "manga com cenoura" },
  { emoji: "🔴", name: "Suco Vermelho", description: "morango com hortelã" },
];

// Default soup flavors with their info
const defaultSoupFlavors: FlavorDataWithStock[] = [
  { emoji: "🟠", name: "Sopa de Abóbora", description: "termogênica com gengibre" },
  { emoji: "⚪", name: "Sopa de Aipim", description: "cremoso com alho-poró" },
  { emoji: "🟢", name: "Sopa de Batata-doce", description: "com couve e chuchu" },
];

const KitFlavorSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  kitName,
  juiceQuantity,
  soupQuantity,
  isLoading = false,
  initialJuiceFlavors = [],
  initialSoupFlavors = [],
  juiceFlavorsData,
  soupFlavorsData,
}: KitFlavorSelectionModalProps) => {
  // Use provided flavors or fallback to defaults
  const juiceFlavors = juiceFlavorsData || defaultJuiceFlavors;
  const soupFlavors = soupFlavorsData || defaultSoupFlavors;
  // Initialize juice selections
  const initJuiceSelections = (): Record<string, number> => {
    const selections: Record<string, number> = {};
    juiceFlavors.forEach((f) => {
      const existing = initialJuiceFlavors.find((s) => s.name === f.name);
      selections[f.name] = existing?.quantity || 0;
    });
    return selections;
  };

  // Initialize soup selections
  const initSoupSelections = (): Record<string, number> => {
    const selections: Record<string, number> = {};
    soupFlavors.forEach((f) => {
      const existing = initialSoupFlavors.find((s) => s.name === f.name);
      selections[f.name] = existing?.quantity || 0;
    });
    return selections;
  };

  const [juiceSelections, setJuiceSelections] = useState<Record<string, number>>(initJuiceSelections);
  const [soupSelections, setSoupSelections] = useState<Record<string, number>>(initSoupSelections);
  const [leaveToUs, setLeaveToUs] = useState(false);

  // Calculate totals
  const totalJuicesSelected = Object.values(juiceSelections).reduce((a, b) => a + b, 0);
  const totalSoupsSelected = Object.values(soupSelections).reduce((a, b) => a + b, 0);
  
  const remainingJuices = juiceQuantity - totalJuicesSelected;
  const remainingSoups = soupQuantity - totalSoupsSelected;
  
  const isJuicesComplete = totalJuicesSelected === juiceQuantity;
  const isSoupsComplete = totalSoupsSelected === soupQuantity;
  const isComplete = isJuicesComplete && isSoupsComplete;
  
  const isJuicesOverLimit = totalJuicesSelected > juiceQuantity;
  const isSoupsOverLimit = totalSoupsSelected > soupQuantity;

  const updateJuiceQuantity = (flavor: string, delta: number) => {
    const flavorData = juiceFlavors.find(f => f.name === flavor);
    const maxStock = flavorData?.stock_quantity ?? Infinity;
    
    setJuiceSelections((prev) => {
      const current = prev[flavor] || 0;
      const newValue = Math.max(0, current + delta);
      
      // Prevent exceeding limit or stock
      const otherTotal = Object.entries(prev)
        .filter(([name]) => name !== flavor)
        .reduce((sum, [_, qty]) => sum + qty, 0);
      
      if (otherTotal + newValue > juiceQuantity) return prev;
      if (newValue > maxStock) return prev;
      
      return { ...prev, [flavor]: newValue };
    });
    setLeaveToUs(false);
  };

  const updateSoupQuantity = (flavor: string, delta: number) => {
    const flavorData = soupFlavors.find(f => f.name === flavor);
    const maxStock = flavorData?.stock_quantity ?? Infinity;
    
    setSoupSelections((prev) => {
      const current = prev[flavor] || 0;
      const newValue = Math.max(0, current + delta);
      
      // Prevent exceeding limit or stock
      const otherTotal = Object.entries(prev)
        .filter(([name]) => name !== flavor)
        .reduce((sum, [_, qty]) => sum + qty, 0);
      
      if (otherTotal + newValue > soupQuantity) return prev;
      if (newValue > maxStock) return prev;
      
      return { ...prev, [flavor]: newValue };
    });
    setLeaveToUs(false);
  };

  const handleLeaveToUsChange = (checked: boolean) => {
    setLeaveToUs(checked);
    if (checked) {
      // Clear all selections
      const emptyJuices: Record<string, number> = {};
      const emptySoups: Record<string, number> = {};
      juiceFlavors.forEach((f) => (emptyJuices[f.name] = 0));
      soupFlavors.forEach((f) => (emptySoups[f.name] = 0));
      setJuiceSelections(emptyJuices);
      setSoupSelections(emptySoups);
    }
  };

  const handleConfirm = () => {
    celebrateCheckout();

    if (leaveToUs) {
      // Send special markers for both
      onConfirm(
        [{ name: "Deixar a cargo da casa", quantity: juiceQuantity, category: "Suco" }],
        [{ name: "Deixar a cargo da casa", quantity: soupQuantity, category: "Sopa" }]
      );
    } else {
      // Build flavor arrays
      const juiceFlavorsList: FlavorSelection[] = Object.entries(juiceSelections)
        .filter(([_, qty]) => qty > 0)
        .map(([name, quantity]) => ({ name, quantity, category: "Suco" }));

      const soupFlavorsList: FlavorSelection[] = Object.entries(soupSelections)
        .filter(([_, qty]) => qty > 0)
        .map(([name, quantity]) => ({ name, quantity, category: "Sopa" }));

      onConfirm(juiceFlavorsList, soupFlavorsList);
    }
  };

  const canConfirm = leaveToUs || isComplete;

  // Progress percentage
  const juiceProgress = Math.min((totalJuicesSelected / juiceQuantity) * 100, 100);
  const soupProgress = Math.min((totalSoupsSelected / soupQuantity) * 100, 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[100dvh] sm:max-h-[90vh] h-[100dvh] sm:h-auto flex flex-col p-0 gap-0 sm:rounded-lg rounded-none">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-lg font-bold text-center">
            🧃🍲 Escolha seus sabores
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {kitName}
          </p>
        </DialogHeader>

        {/* Dual Progress Bars */}
        <div className="px-4 pt-3 space-y-2">
          {/* Juice Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm">🧃</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className={isJuicesComplete ? "text-primary font-medium" : "text-muted-foreground"}>
                  Sucos: {totalJuicesSelected} de {juiceQuantity}
                </span>
                {isJuicesOverLimit && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Excedeu!
                  </span>
                )}
                {isJuicesComplete && !isJuicesOverLimit && (
                  <span className="text-primary flex items-center gap-1">
                    <Check className="w-3 h-3" /> Completo
                  </span>
                )}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isJuicesOverLimit ? "bg-destructive" : isJuicesComplete ? "bg-primary" : "bg-primary/60"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${juiceProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* Soup Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm">🍲</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className={isSoupsComplete ? "text-terracotta font-medium" : "text-muted-foreground"}>
                  Sopas: {totalSoupsSelected} de {soupQuantity}
                </span>
                {isSoupsOverLimit && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Excedeu!
                  </span>
                )}
                {isSoupsComplete && !isSoupsOverLimit && (
                  <span className="text-terracotta flex items-center gap-1">
                    <Check className="w-3 h-3" /> Completo
                  </span>
                )}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isSoupsOverLimit ? "bg-destructive" : isSoupsComplete ? "bg-terracotta" : "bg-terracotta/60"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${soupProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {/* Leave to Us Option */}
          <button
            type="button"
            onClick={() => handleLeaveToUsChange(!leaveToUs)}
            className={`w-full p-3 rounded-xl border-2 transition-all duration-300 mb-4 relative overflow-hidden ${
              leaveToUs
                ? "border-primary bg-primary/10"
                : "border-dashed border-border hover:border-primary/50 bg-muted/30"
            }`}
          >
            {leaveToUs && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            )}
            <div className="flex items-center gap-3 relative z-10">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  leaveToUs ? "bg-primary border-primary" : "border-muted-foreground"
                }`}
              >
                {leaveToUs && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${leaveToUs ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`font-medium ${leaveToUs ? "text-primary" : "text-foreground"}`}>
                    Deixar a cargo da casa
                  </span>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Montamos um mix variado e equilibrado para você
                </p>
              </div>
            </div>
          </button>

          <AnimatePresence>
            {!leaveToUs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Juice Section */}
                <div>
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2 text-sm">
                    🧃 Sucos Detox
                    <span className="text-xs font-normal text-muted-foreground">
                      (escolha {juiceQuantity} unidades)
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {juiceFlavors.map((flavor) => {
                      const qty = juiceSelections[flavor.name] || 0;
                      const threshold = flavor.low_stock_threshold ?? 5;
                      const hasLowStock = flavor.show_stock && flavor.stock_quantity !== null && flavor.stock_quantity !== undefined && flavor.stock_quantity < threshold;
                      const isOutOfStock = flavor.show_stock && flavor.stock_quantity === 0;
                      const maxReached = flavor.stock_quantity !== null && flavor.stock_quantity !== undefined && qty >= flavor.stock_quantity;
                      
                      return (
                        <div
                          key={flavor.name}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                            isOutOfStock
                              ? "bg-destructive/5 border-destructive/30 opacity-60"
                              : qty > 0 ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{flavor.emoji}</span>
                            <div>
                              <span className="text-sm font-medium text-foreground">{flavor.name}</span>
                              <span className="text-xs text-muted-foreground block">{flavor.description}</span>
                              {hasLowStock && !isOutOfStock && (
                                <span className="text-xs text-destructive font-medium animate-pulse">
                                  🔥 Apenas {flavor.stock_quantity} disponíveis
                                </span>
                              )}
                              {isOutOfStock && (
                                <span className="text-xs text-destructive font-medium">Esgotado</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateJuiceQuantity(flavor.name, -1)}
                              disabled={qty === 0}
                              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted-foreground/20 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-medium text-sm">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateJuiceQuantity(flavor.name, 1)}
                              disabled={isOutOfStock || maxReached}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                                isOutOfStock || maxReached
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : "bg-primary/20 text-primary hover:bg-primary/30"
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Soup Section */}
                <div>
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2 text-sm">
                    🍲 Sopas Funcionais
                    <span className="text-xs font-normal text-muted-foreground">
                      (escolha {soupQuantity} unidades)
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {soupFlavors.map((flavor) => {
                      const qty = soupSelections[flavor.name] || 0;
                      const threshold = flavor.low_stock_threshold ?? 5;
                      const hasLowStock = flavor.show_stock && flavor.stock_quantity !== null && flavor.stock_quantity !== undefined && flavor.stock_quantity < threshold;
                      const isOutOfStock = flavor.show_stock && flavor.stock_quantity === 0;
                      const maxReached = flavor.stock_quantity !== null && flavor.stock_quantity !== undefined && qty >= flavor.stock_quantity;
                      
                      return (
                        <div
                          key={flavor.name}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                            isOutOfStock
                              ? "bg-destructive/5 border-destructive/30 opacity-60"
                              : qty > 0 ? "bg-terracotta/5 border-terracotta/30" : "bg-muted/30 border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{flavor.emoji}</span>
                            <div>
                              <span className="text-sm font-medium text-foreground">{flavor.name}</span>
                              <span className="text-xs text-muted-foreground block">{flavor.description}</span>
                              {hasLowStock && !isOutOfStock && (
                                <span className="text-xs text-destructive font-medium animate-pulse">
                                  🔥 Apenas {flavor.stock_quantity} disponíveis
                                </span>
                              )}
                              {isOutOfStock && (
                                <span className="text-xs text-destructive font-medium">Esgotado</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateSoupQuantity(flavor.name, -1)}
                              disabled={qty === 0}
                              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted-foreground/20 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-medium text-sm">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateSoupQuantity(flavor.name, 1)}
                              disabled={isOutOfStock || maxReached}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                                isOutOfStock || maxReached
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : "bg-terracotta/20 text-terracotta hover:bg-terracotta/30"
                              }`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border bg-background">
          <Button
            variant="cta"
            size="lg"
            className="w-full"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? (
              <>Adicionando...</>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Confirmar e adicionar
              </>
            )}
          </Button>
          {!canConfirm && !leaveToUs && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {!isJuicesComplete && `Faltam ${remainingJuices} sucos. `}
              {!isSoupsComplete && `Faltam ${remainingSoups} sopas.`}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KitFlavorSelectionModal;
