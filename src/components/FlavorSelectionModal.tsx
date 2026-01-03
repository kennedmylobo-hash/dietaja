import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, Beef, Drumstick, Utensils, Sparkles, Check, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

interface FlavorSelection {
  name: string;
  quantity: number;
  category: string;
}

interface FlavorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (flavors: FlavorSelection[]) => void;
  packageName: string;
  packageQuantity: number;
  isLoading?: boolean;
}

// Sabores organizados por categoria
const flavorCategories = [
  {
    id: "carnes",
    name: "Carnes",
    icon: Beef,
    color: "red",
    flavors: [
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
    ],
  },
  {
    id: "frangos",
    name: "Frangos",
    icon: Drumstick,
    color: "amber",
    flavors: [
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
    ],
  },
  {
    id: "massas",
    name: "Massas",
    icon: Utensils,
    color: "orange",
    flavors: [
      "Espaguete Integral com Carne",
      "Espaguete Integral com Frango",
      "Macarronada à Bolonhesa",
      "Macarronada de Frango ao Molho Bechamel",
    ],
  },
  {
    id: "especiais",
    name: "Especiais",
    icon: Sparkles,
    color: "purple",
    flavors: [
      "Escondidinho de Batata Inglesa com Carne Desfiada",
      "Escondidinho de Batata Inglesa com Carne Moída",
      "Escondidinho de Aipim com Carne Desfiada",
      "Feijoada Light com Arroz Branco e Couve",
      "Filé de Peixe com Alecrim, Arroz Integral e Purê de Abóbora",
      "Filé Suíno ao Molho de Laranja e Mel com Purê de Aipim",
    ],
  },
];

const FlavorSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  packageName,
  packageQuantity,
  isLoading = false,
}: FlavorSelectionModalProps) => {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [leaveToUs, setLeaveToUs] = useState(false);

  const totalSelected = useMemo(() => {
    return Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  }, [selections]);

  const remaining = packageQuantity - totalSelected;
  const isComplete = remaining === 0 || leaveToUs;
  const isOverLimit = remaining < 0;

  const updateQuantity = (flavor: string, delta: number) => {
    // Disable manual selection if "leave to us" is checked
    if (leaveToUs) return;
    
    setSelections((prev) => {
      const current = prev[flavor] || 0;
      const newValue = current + delta;
      
      if (newValue <= 0) {
        const { [flavor]: _, ...rest } = prev;
        return rest;
      }
      
      // Don't allow adding more if already at limit
      if (delta > 0 && remaining <= 0) {
        return prev;
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
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="text-lg font-bold">
            Escolha seus sabores
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {packageName} • {packageQuantity} marmitas
          </p>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="px-4 py-3 bg-muted/50 border-b sticky top-[72px] z-10">
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

        <ScrollArea className="flex-1 max-h-[50vh]">
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
              const Icon = category.icon;
              const colorClasses = getColorClasses(category.color);
              
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
                      
                      return (
                        <div
                          key={flavor}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected
                              ? "border-terracotta bg-terracotta-light/30"
                              : "border-border bg-background hover:border-terracotta/30"
                          }`}
                        >
                          <span className={`text-sm ${isSelected ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                            {flavor}
                          </span>
                          
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
                              disabled={remaining <= 0 && !isSelected}
                              className={`p-1.5 rounded-full transition-colors ${
                                remaining <= 0 && !isSelected
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
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-background sticky bottom-0">
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
