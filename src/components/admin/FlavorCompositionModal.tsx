import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  FlavorSideItem,
  FlavorSidesByLine,
  parseSides,
  getTotalWeight,
} from "@/lib/flavor-description";
import { Json } from "@/integrations/supabase/types";

interface FlavorCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  flavorId: string;
  flavorName: string;
  sides: Json | null;
  onSaved: (flavorId: string, newSides: Json) => void;
}

const emptyItem = (): FlavorSideItem => ({ name: "", weight: 0 });

const FlavorCompositionModal = ({
  isOpen,
  onClose,
  flavorId,
  flavorName,
  sides,
  onSaved,
}: FlavorCompositionModalProps) => {
  const [fitItems, setFitItems] = useState<FlavorSideItem[]>([]);
  const [fitnessItems, setFitnessItems] = useState<FlavorSideItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseSides(sides);
      setFitItems(parsed?.fit?.length ? [...parsed.fit] : [emptyItem()]);
      setFitnessItems(parsed?.fitness?.length ? [...parsed.fitness] : [emptyItem()]);
    }
  }, [isOpen, sides]);

  const updateItem = (
    line: "fit" | "fitness",
    index: number,
    field: "name" | "weight",
    value: string | number
  ) => {
    const setter = line === "fit" ? setFitItems : setFitnessItems;
    setter((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = (line: "fit" | "fitness") => {
    const setter = line === "fit" ? setFitItems : setFitnessItems;
    setter((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (line: "fit" | "fitness", index: number) => {
    const setter = line === "fit" ? setFitItems : setFitnessItems;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const cleanItems = (items: FlavorSideItem[]): FlavorSideItem[] =>
    items.filter((item) => item.name.trim() && item.weight > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSides: FlavorSidesByLine = {};
      const cleanFit = cleanItems(fitItems);
      const cleanFitness = cleanItems(fitnessItems);

      if (cleanFit.length > 0) newSides.fit = cleanFit;
      if (cleanFitness.length > 0) newSides.fitness = cleanFitness;

      const sidesValue = Object.keys(newSides).length > 0 ? (newSides as unknown as Json) : null;

      const { error } = await supabase
        .from("marmita_flavors")
        .update({ sides: sidesValue })
        .eq("id", flavorId);

      if (error) throw error;

      onSaved(flavorId, sidesValue as Json);
      toast({ title: "Composição salva com sucesso!" });
      onClose();
    } catch (error) {
      console.error("Error saving composition:", error);
      toast({
        title: "Erro ao salvar composição",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderColumn = (
    line: "fit" | "fitness",
    items: FlavorSideItem[],
    label: string,
    targetWeight: number
  ) => {
    const total = getTotalWeight(items.filter((i) => i.name.trim() && i.weight > 0));
    const isOnTarget = total === targetWeight;

    return (
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-semibold text-sm">{label}</Label>
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
            Total: {total}g
          </Badge>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Ingrediente"
                value={item.name}
                onChange={(e) => updateItem(line, index, "name", e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Input
                type="number"
                placeholder="g"
                value={item.weight || ""}
                onChange={(e) =>
                  updateItem(line, index, "weight", parseInt(e.target.value) || 0)
                }
                className="w-20 h-8 text-sm text-center"
                min={0}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => removeItem(line, index)}
                disabled={items.length <= 1}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => addItem(line)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar ingrediente
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Composição: {flavorName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Defina os ingredientes e pesos para cada linha
          </p>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-6">
          {renderColumn("fit", fitItems, "🥗 FIT (300g)", 300)}
          <div className="hidden sm:block w-px bg-border" />
          <div className="sm:hidden h-px bg-border" />
          {renderColumn("fitness", fitnessItems, "💪 FITNESS (450g)", 450)}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Composição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FlavorCompositionModal;
