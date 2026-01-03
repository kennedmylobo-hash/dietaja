import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, Beef, Drumstick, Utensils, Sparkles, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { celebrateCheckout } from "@/lib/confetti";

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
}

interface FlavorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (flavors: FlavorSelection[]) => void;
  packageName: string;
  packageQuantity: number;
  isLoading?: boolean;
  flavorsByCategory?: FlavorCategory[];
  flavorStockData?: FlavorData[];
}

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
  isLoading = false,
  flavorsByCategory,
  flavorStockData = [],
}: FlavorSelectionModalProps) => {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [leaveToUs, setLeaveToUs] = useState(false);

  // Use provided flavors or fallback to defaults
  const flavorCategories = flavorsByCategory || defaultFlavorCategories;

  // Helper to get stock data for a flavor
  const getFlavorStock = (flavorName: string): FlavorData | undefined => {
    return flavorStockData.find(f => f.name === flavorName);
  };

  const totalSelected = useMemo(() => {
    return Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  }, [selections]);

  const remaining = packageQuantity - totalSelected;
  const isComplete = remaining === 0 || leaveToUs;
  const isOverLimit = remaining < 0;

  const updateQuantity = (flavor: string, delta: number) => {
    // Disable manual selection if "leave to us" is checked
    if (leaveToUs) return;
    
    const stockData = getFlavorStock(flavor);
    const maxStock = stockData?.stock_quantity ?? Infinity;
    
    setSelections((prev) => {
      const current = prev[flavor] || 0;
      const newValue = current + delta;
      
      if (newValue <= 0) {
        const { [flavor]: _, ...rest } = prev;
        return rest;
      }
      
      // Don't allow adding more if already at limit or stock limit
      if (delta > 0) {
        if (remaining <= 0) return prev;
        if (newValue > maxStock) return prev;
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
      // Send a special "leave to us" marker
      onConfirm([{
        name: "Deixar a cargo da Dieta Já",
        quantity: packageQuantity,
        category: "Escolha da casa",
      }]);
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
    
    onConfirm(flavorsArray);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b bg-background shrink-0">
          <DialogTitle className="text-lg font-bold">
            Escolha seus sabores
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {packageName} • {packageQuantity} marmitas
          </p>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="px-4 py-3 bg-muted/50 border-b shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {leaveToUs ? "Escolha da casa" : `${totalSelected} de ${packageQuantity} selecionadas`}
            </span>
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.span
                  key="complete"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 text-sm text-primary font-medium"
                >
                  <Check className="w-4 h-4" />
                  {leaveToUs ? "Mix variado" : "Completo!"}
                </motion.span>
              ) : isOverLimit ? (
                <motion.span
                  key="over"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 text-sm text-destructive font-medium"
                >
                  <AlertCircle className="w-4 h-4" />
                  Limite excedido
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
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                isOverLimit ? "bg-destructive" : isComplete ? "bg-primary" : "bg-terracotta"
              }`}
              initial={{ width: 0 }}
              animate={{ width: leaveToUs ? "100%" : `${Math.min((totalSelected / packageQuantity) * 100, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Leave to us option - Highlighted with shimmer and badge */}
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
              {/* Shimmer animation overlay */}
              {!leaveToUs && (
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              )}
              
              {/* Recommended badge */}
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
                  🍽️ Deixar a cargo da Dieta Já
                </span>
                <p className="text-sm text-muted-foreground">
                  Montamos um mix variado com nossos sabores mais pedidos
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
                      const hasLowStock = stockData?.show_stock && stockData.stock_quantity !== null && stockData.stock_quantity < 5;
                      const isOutOfStock = stockData?.show_stock && stockData.stock_quantity === 0;
                      const maxReached = stockData?.stock_quantity !== null && qty >= (stockData?.stock_quantity ?? Infinity);
                      
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
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-sm ${isSelected ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                              {flavor}
                            </span>
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
                          
                          <div className="flex items-center gap-2">
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
                            
                            <button
                              onClick={() => updateQuantity(flavor, 1)}
                              disabled={(remaining <= 0 && !isSelected) || isOutOfStock || maxReached}
                              className={`p-1.5 rounded-full transition-colors ${
                                (remaining <= 0 && !isSelected) || isOutOfStock || maxReached
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : "bg-terracotta hover:bg-terracotta/90 text-white"
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
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
        <div className="p-4 border-t bg-background shrink-0">
          <Button
            variant="cta"
            className="w-full"
            onClick={handleConfirm}
            disabled={!isComplete || isLoading}
          >
            {isLoading ? (
              "Adicionando..."
            ) : isComplete ? (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar ao carrinho
              </>
            ) : (
              `Selecione mais ${remaining} sabor${remaining > 1 ? "es" : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlavorSelectionModal;
