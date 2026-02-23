import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  FlavorSideItem,
  FlavorSidesByLine,
  parseSides,
  getTotalWeight,
  mapLineTypeToKey,
  generateDefaultSides,
} from "@/lib/flavor-description";
import { Json } from "@/integrations/supabase/types";

interface ConfirmItem {
  name: string;
  matchedName: string;
  quantity: number;
  flavorId: string | null;
  sides: FlavorSideItem[];
}

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: ConfirmItem[];
  lineType: "fit" | "fitness" | "personalizada";
  customerName: string;
  subtotal: number;
  deliveryDate: string;
  deliveryTime: string;
  paymentStatus: "paid" | "pending_payment";
  onItemsUpdated: (flavorId: string, newSides: Json) => void;
  onSubtotalChanged?: (value: number) => void;
}

// generateDefaultSides, extractProteinName, extractCarbName, parseAllIngredients
// are now in src/lib/flavor-description.ts

const OrderConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  items: initialItems,
  lineType,
  customerName,
  subtotal,
  deliveryDate,
  deliveryTime,
  paymentStatus,
  onItemsUpdated,
  onSubtotalChanged,
}: OrderConfirmationModalProps) => {
  const [editableItems, setEditableItems] = useState<ConfirmItem[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [editableSubtotal, setEditableSubtotal] = useState(String(subtotal));

  useEffect(() => {
    if (isOpen) {
      setEditableItems(initialItems.map(item => ({
        ...item,
        sides: item.sides.length > 0
          ? item.sides.map(s => ({ ...s }))
          : lineType === 'personalizada'
            ? [] // personalizada items have weights in the description
            : generateDefaultSides(item.matchedName || item.name, lineType),
      })));
      setEditableSubtotal(String(subtotal));
    }
  }, [isOpen, initialItems, subtotal]);

  const targetWeight = lineType === "fit" ? 300 : lineType === "fitness" ? 450 : 0;

  const updateSideWeight = (itemIdx: number, sideIdx: number, value: number) => {
    setEditableItems(prev =>
      prev.map((item, i) =>
        i === itemIdx
          ? {
              ...item,
              sides: item.sides.map((s, si) =>
                si === sideIdx ? { ...s, weight: value } : s
              ),
            }
          : item
      )
    );
  };

  const updateSideName = (itemIdx: number, sideIdx: number, value: string) => {
    setEditableItems(prev =>
      prev.map((item, i) =>
        i === itemIdx
          ? {
              ...item,
              sides: item.sides.map((s, si) =>
                si === sideIdx ? { ...s, name: value } : s
              ),
            }
          : item
      )
    );
  };

  const updateQuantity = (itemIdx: number, value: number) => {
    setEditableItems(prev =>
      prev.map((item, i) =>
        i === itemIdx ? { ...item, quantity: Math.max(1, value) } : item
      )
    );
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // For personalizada, skip saving sides to DB — weights are in the description
      if (lineType !== 'personalizada') {
        const lineKey = mapLineTypeToKey(lineType === "fit" ? "emagrecimento" : "hipertrofia");

        for (const item of editableItems) {
          if (!item.flavorId || item.sides.length === 0) continue;

          const cleanSides = item.sides.filter(s => s.name.trim() && s.weight > 0);
          if (cleanSides.length === 0) continue;

          const { data: current } = await supabase
            .from("marmita_flavors")
            .select("sides")
            .eq("id", item.flavorId)
            .single();

          const existing = parseSides(current?.sides as Json | null) || {};
          const newSides: FlavorSidesByLine = {
            ...existing,
            [lineKey]: cleanSides,
          };

          const sidesJson = newSides as unknown as Json;
          await supabase
            .from("marmita_flavors")
            .update({ sides: sidesJson })
            .eq("id", item.flavorId);

          onItemsUpdated(item.flavorId, sidesJson);
        }
      }

      onConfirm();
    } catch (error) {
      console.error("Error saving compositions:", error);
      toast({
        title: "Erro ao salvar composições",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Confirmar Pedido de {customerName}
            {editableItems.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {editableItems.reduce((s, i) => s + i.quantity, 0)} marmitas
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Revise os pesos e quantidades antes de lançar. Alterações serão salvas para próximos pedidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {editableItems.map((item, itemIdx) => {
            const total = getTotalWeight(item.sides.filter(s => s.name.trim() && s.weight > 0));
            const isOnTarget = total === targetWeight;

            return (
              <div key={itemIdx} className="border rounded-lg p-3 space-y-3">
                {/* Item header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{item.matchedName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {lineType === "fit" ? "FIT" : lineType === "fitness" ? "FITNESS" : "PERSONALIZADA"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs mr-1">Qtd:</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(itemIdx, parseInt(e.target.value) || 1)}
                      className="w-16 h-7 text-sm text-center"
                      min={1}
                    />
                  </div>
                </div>

                {/* Ingredients */}
                {lineType === 'personalizada' ? (
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Descrição completa:</p>
                    <p className="text-sm font-medium">{item.matchedName}</p>
                  </div>
                ) : item.sides.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Ingredientes</Label>
                      <Badge
                        variant={isOnTarget ? "default" : "secondary"}
                        className={`text-xs ${
                          total > 0
                            ? isOnTarget
                              ? "bg-green-600"
                              : "bg-amber-500"
                            : ""
                        }`}
                      >
                        {total}g / {targetWeight}g
                      </Badge>
                    </div>
                    {item.sides.map((side, sideIdx) => (
                      <div key={sideIdx} className="flex items-center gap-2">
                        <Input
                          value={side.name}
                          onChange={(e) => updateSideName(itemIdx, sideIdx, e.target.value)}
                          className="flex-1 h-7 text-xs"
                          placeholder="Ingrediente"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={side.weight || ""}
                            onChange={(e) =>
                              updateSideWeight(itemIdx, sideIdx, parseInt(e.target.value) || 0)
                            }
                            className="w-16 h-7 text-xs text-center"
                            min={0}
                          />
                          <span className="text-xs text-muted-foreground">g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          <Separator />

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            <p><strong>Entrega:</strong> {formatDateBR(deliveryDate)} — {deliveryTime}</p>
            <div className="flex items-center gap-2">
              <strong>Valor:</strong>
              <span className="text-sm">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editableSubtotal}
                onChange={(e) => {
                  setEditableSubtotal(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (val > 0 && onSubtotalChanged) onSubtotalChanged(val);
                }}
                className="w-28 h-7 text-sm"
              />
            </div>
            <p><strong>Pagamento:</strong> {paymentStatus === "paid" ? "✅ Pago" : "⏳ A receber"}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            Voltar
          </Button>
          <Button onClick={handleConfirm} disabled={confirming}>
            {confirming ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Confirmar e Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export type { ConfirmItem };
export default OrderConfirmationModal;
