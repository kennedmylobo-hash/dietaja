import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, X, Check } from "lucide-react";
import { motion } from "framer-motion";

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
  price_override_fit?: number | null;
  price_override_fitness?: number | null;
  calories?: number | null;
  protein_g?: number | null;
  image_url?: string | null;
}

interface KitFlavorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (flavors: FlavorSelection[], totalQty: number) => void;
  packageName: string;
  packageQuantity: number;
  packageUnitPrice: number;
  packageWeight?: number;
  lineType?: string;
  flavorsByCategory?: FlavorCategory[];
  flavorStockData?: FlavorData[];
}

const categoryIcons: Record<string, string> = {
  carnes: "🥩",
  frangos: "🐔",
  massas: "🍝",
  especiais: "⭐",
  peixes: "🐟",
  vegetariano: "🥬",
  sopas: "🍜",
};

const KitFlavorPicker = ({
  isOpen, onClose, onConfirm, packageName, packageQuantity,
  packageUnitPrice, packageWeight = 300, lineType = "emagrecimento",
  flavorsByCategory, flavorStockData,
}: KitFlavorPickerProps) => {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const maxVarieties = packageQuantity <= 7 ? 3 : packageQuantity <= 14 ? 7 : packageQuantity <= 21 ? 10 : 14;
  const totalSelected = Object.values(selections).reduce((a, b) => a + b, 0);
  const varietiesSelected = Object.keys(selections).length;
  const canAddMore = totalSelected < packageQuantity;
  const canAddVariety = varietiesSelected < maxVarieties;
  const isComplete = totalSelected === packageQuantity;

  const addFlavor = (name: string) => {
    if (!canAddMore) return;
    const isExisting = name in selections;
    if (!isExisting && !canAddVariety) return;
    setSelections(prev => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  };

  const removeFlavor = (name: string) => {
    setSelections(prev => {
      const next = { ...prev };
      if (next[name] <= 1) delete next[name];
      else next[name]--;
      return next;
    });
  };

  const total = packageUnitPrice * packageQuantity;

  const filteredCategories = useMemo(() => {
    if (!flavorsByCategory) return [];
    if (!searchQuery) return flavorsByCategory;
    const q = searchQuery.toLowerCase();
    return flavorsByCategory
      .map(cat => ({
        ...cat,
        flavors: cat.flavors.filter(f => f.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.flavors.length > 0);
  }, [flavorsByCategory, searchQuery]);

  const label = lineType === "emagrecimento" ? "FIT" : "FITNESS";

  const clearSelections = () => setSelections({});

  const handleConfirm = () => {
    if (!isComplete) return;
    const result = Object.entries(selections).map(([name, qty]) => ({
      name,
      quantity: qty,
      category: flavorsByCategory?.find(c => c.flavors.includes(name))?.id || "",
    }));
    onConfirm(result, packageQuantity);
    setSelections({});
    setSearchQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { onClose(); setSelections({}); setSearchQuery(""); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold">Monte seu Kit {label}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {packageQuantity} unidades · {packageWeight}g · R$ {packageUnitPrice.toFixed(2).replace(".", ",")}/un
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 mt-1">
              {varietiesSelected}/{maxVarieties} sabores
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 pb-0 shrink-0">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Selecionados</span>
              <span className="font-medium">{totalSelected}/{packageQuantity}</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors ${isComplete ? "bg-green-500" : totalSelected > 0 ? "bg-primary" : "bg-muted"}`}
                initial={{ width: 0 }}
                animate={{ width: `${(totalSelected / packageQuantity) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar sabor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Flavors grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nenhum sabor encontrado</div>
          ) : (
            filteredCategories.map(category => (
              <div key={category.id} className="mb-4">
                <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-white dark:bg-gray-950 py-1 z-10">
                  <span className="text-lg">{categoryIcons[category.id] || "🍽️"}</span>
                  <h4 className="font-semibold text-sm">{category.name}</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {category.flavors.map(flavor => {
                    const qty = selections[flavor] || 0;
                    const stock = flavorStockData?.find(s => s.name === flavor);
                    const kcal = stock?.calories || null;
                    const imgUrl = stock?.image_url || null;
                    const isSelected = qty > 0;
                    const isDisabled = !canAddMore && !isSelected;
                    return (
                      <div className="relative">
                        <motion.button
                          key={flavor}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addFlavor(flavor)}
                          disabled={!isSelected && !canAddMore}
                          title={!canAddMore && !isSelected ? "Limite de unidades atingido" : undefined}
                          className={`relative flex flex-col items-center text-center p-2 rounded-xl border-2 transition-all w-full ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-muted-foreground/30 bg-card"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {/* Foto */}
                          <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted mb-1.5">
                            {imgUrl ? (
                              <img src={imgUrl} alt={flavor} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                {categoryIcons[category.id] || "🍽️"}
                              </div>
                            )}
                          </div>
                          {/* Nome */}
                          <p className="text-[11px] font-medium leading-tight line-clamp-2 mb-1">{flavor}</p>
                          {/* Kcal */}
                          {kcal && <p className="text-[9px] text-muted-foreground">🔥~{kcal}kcal</p>}
                        </motion.button>
                        {/* Controles + e - */}
                        {isSelected && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFlavor(flavor); }}
                              className="h-8 w-8 flex items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:bg-muted transition-colors active:scale-90"
                              aria-label="Remover"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-base font-bold w-6 text-center">{qty}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); addFlavor(flavor); }}
                              disabled={!canAddMore}
                              className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-90"
                              aria-label="Adicionar"
                              title={!canAddMore ? "Limite de unidades atingido" : undefined}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {!isSelected && (
                          <p className="text-[9px] text-primary font-medium mt-0.5">+ Adicionar</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm">
                <span className="font-bold">Total:</span> R$ {total.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-[10px] text-muted-foreground">{packageQuantity} un · R$ {packageUnitPrice.toFixed(2).replace(".", ",")}/un</p>
            </div>
            <div className="flex gap-2">
              {totalSelected > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelections} className="text-xs">
                  Limpar
                </Button>
              )}
              <Button size="sm" onClick={handleConfirm} disabled={!isComplete}>
                {isComplete ? "✓ Confirmar Pedido" : `Faltam ${packageQuantity - totalSelected}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KitFlavorPicker;
