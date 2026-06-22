import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Check } from "lucide-react";

interface FlavorDetail {
  id: string;
  name: string;
  category: string;
  sides: any;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  fiber_g?: number;
  allergens?: string[];
  restrictions?: string[];
  price: number | { fit: number; fitness: number };
  image_url?: string;
}

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flavor: FlavorDetail | null;
  onAdd: () => void;
  adding: string | null;
  lineMode?: "emagrecimento" | "hipertrofia";
}

const categoryBg: Record<string, string> = {
  carnes: "bg-red-50 dark:bg-red-950/20",
  frangos: "bg-amber-50 dark:bg-amber-950/20",
  massas: "bg-yellow-50 dark:bg-yellow-950/20",
  especiais: "bg-purple-50 dark:bg-purple-950/20",
  peixes: "bg-blue-50 dark:bg-blue-950/20",
  vegetariano: "bg-green-50 dark:bg-green-950/20",
  sopas: "bg-orange-50 dark:bg-orange-950/20",
};

const ProductDetailModal = ({ open, onOpenChange, flavor, onAdd, adding, lineMode = "emagrecimento" }: ProductDetailModalProps) => {
  if (!flavor) return null;

  const sides = flavor.sides as any;
  const fitSides = sides?.fit || sides?.emagrecimento || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 overflow-y-auto">
        <div className={`${categoryBg[flavor.category] || "bg-muted/30"}`}>
          {flavor.image_url ? (
            <div className="w-full aspect-video">
              <img src={flavor.image_url} alt={flavor.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-6xl bg-muted">
              🍽️
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          <DialogHeader className="p-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold">{flavor.name}</DialogTitle>
                <Badge variant="secondary" className="mt-1">{flavor.category}</Badge>
              </div>
              <div className="text-right">
                {typeof flavor.price === 'object' ? (
                  <div className={`rounded-lg p-3 ${lineMode === "emagrecimento" ? "bg-green-50" : "bg-purple-50"}`}>
                    <div className={`text-xs font-bold ${lineMode === "emagrecimento" ? "text-green-700" : "text-purple-700"}`}>
                      {lineMode === "emagrecimento" ? "🔥 FIT — 300g" : "💪 FITNESS — 450g"}
                    </div>
                    <div className={`text-2xl font-bold ${lineMode === "emagrecimento" ? "text-green-600" : "text-purple-600"}`}>
                      R$ {lineMode === "emagrecimento" ? flavor.price.fit.toFixed(2).replace(".", ",") : flavor.price.fitness.toFixed(2).replace(".", ",")}
                    </div>
                    <div className={`text-[10px] ${lineMode === "emagrecimento" ? "text-green-600/70" : "text-purple-600/70"}`}>
                      ~{flavor.calories || (lineMode === "emagrecimento" ? 350 : 420)}kcal · {lineMode === "emagrecimento" ? "Para emagrecer" : "Para ganhar massa"}
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-primary whitespace-nowrap">
                    R$ {flavor.price.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          {fitSides.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Acompanhamentos</h4>
              <div className="space-y-1">
                {fitSides.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                    <span>{s.weight && `${s.weight}g `}{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(flavor.calories || flavor.protein_g || flavor.carbs_g || flavor.fats_g || flavor.fiber_g) && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Informação Nutricional</h4>
              <div className="grid grid-cols-5 gap-2 text-center">
                {flavor.calories && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-lg font-bold">{flavor.calories}</div>
                    <div className="text-[10px] text-muted-foreground">kcal</div>
                  </div>
                )}
                {flavor.protein_g && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-lg font-bold">{flavor.protein_g}g</div>
                    <div className="text-[10px] text-muted-foreground">Proteínas</div>
                  </div>
                )}
                {flavor.carbs_g && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-lg font-bold">{flavor.carbs_g}g</div>
                    <div className="text-[10px] text-muted-foreground">Carboidratos</div>
                  </div>
                )}
                {flavor.fats_g && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-lg font-bold">{flavor.fats_g}g</div>
                    <div className="text-[10px] text-muted-foreground">Gorduras</div>
                  </div>
                )}
                {flavor.fiber_g && (
                  <div className="bg-muted rounded-lg p-2">
                    <div className="text-lg font-bold">{flavor.fiber_g}g</div>
                    <div className="text-[10px] text-muted-foreground">Fibras</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {flavor.allergens && flavor.allergens.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Alérgenos</h4>
              <div className="flex flex-wrap gap-1">
                {flavor.allergens.map((a) => (
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {flavor.restrictions && flavor.restrictions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Restrições Alimentares</h4>
              <div className="flex flex-wrap gap-1">
                {flavor.restrictions.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">
                    {r === "vegano" ? "Vegano" :
                     r === "vegetariano" ? "Vegetariano" :
                     r === "sem_gluten" ? "Sem Glúten" :
                     r === "sem_lacteos" ? "Sem Lácteos" : r}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button className={`w-full h-12 text-base gap-2 ${lineMode === "emagrecimento" ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"}`} onClick={onAdd} disabled={adding === `${flavor.id}-${lineMode}`}>
            <Plus className="w-4 h-4" />
            {adding === `${flavor.id}-${lineMode}` ? "Adicionando..." : `Adicionar ${lineMode === "emagrecimento" ? "FIT 300g" : "FITNESS 450g"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
