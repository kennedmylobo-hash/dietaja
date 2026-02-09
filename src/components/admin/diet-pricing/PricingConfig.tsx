import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings2, ChevronDown, ChevronUp, Plus, Trash2, Save, Loader2 } from "lucide-react";
import type { SubcategoryItem, SubcategoryPricing } from "@/lib/subcategory-pricing";

export interface CategoryPricing {
  costPerKg: number;
  cookingLossPercent: number;
}

export interface PricingSettings {
  proteinPricing: CategoryPricing;
  carbPricing: CategoryPricing;
  veggiePricing: CategoryPricing;
  subcategoryPricing: SubcategoryPricing;
  rawCostPerKg: number;
  cookingLossPercent: number;
  correctionFactor: number;
  costPerGram: number;
  packagingCost: number;
  fixedCostPerMeal: number;
  pricingMode: "margin" | "manual";
  marginPercent: number;
  manualPricePerGram: number;
  packageOptions: PackageOption[];
}

export interface PackageOption {
  days: number;
  label: string;
  discount: number;
}

interface PricingConfigProps {
  settings: PricingSettings;
  onChange: (settings: PricingSettings) => void;
  onSave: () => void;
  saving: boolean;
}

function getCostPerGram(costPerKg: number, cookingLoss: number): number {
  const fc = cookingLoss >= 100 ? 1 : 1 / (1 - cookingLoss / 100);
  return (costPerKg / 1000) * fc;
}

function SubcategoryRow({
  item,
  onChange,
  onRemove,
  canRemove,
}: {
  item: SubcategoryItem;
  onChange: (item: SubcategoryItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const costPerGram = getCostPerGram(item.costPerKg, item.cookingLossPercent);
  const fc = item.cookingLossPercent >= 100 ? 1 : 1 / (1 - item.cookingLossPercent / 100);

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="pl-8 text-sm">
        <Input
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          className="w-full text-sm h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.costPerKg}
          onChange={(e) => onChange({ ...item, costPerKg: parseFloat(e.target.value) || 0 })}
          className="w-24 text-sm h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="1"
          min="0"
          max="90"
          value={item.cookingLossPercent}
          onChange={(e) => onChange({ ...item, cookingLossPercent: parseFloat(e.target.value) || 0 })}
          className="w-20 text-sm h-8"
        />
      </TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        {fc.toFixed(2)}
      </TableCell>
      <TableCell className="text-right font-medium text-primary text-sm">
        R$ {costPerGram.toFixed(4)}
      </TableCell>
      <TableCell className="w-10">
        {canRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive h-7 w-7">
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function CategoryGroup({
  label,
  emoji,
  category,
  subcategories,
  fallbackPricing,
  onSubcategoriesChange,
}: {
  label: string;
  emoji: string;
  category: "protein" | "carb" | "veggie";
  subcategories: SubcategoryItem[];
  fallbackPricing: CategoryPricing;
  onSubcategoriesChange: (items: SubcategoryItem[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  // Compute weighted average for the category header
  const avgCostPerGram = subcategories.length > 0
    ? subcategories.reduce((s, i) => s + getCostPerGram(i.costPerKg, i.cookingLossPercent), 0) / subcategories.length
    : getCostPerGram(fallbackPricing.costPerKg, fallbackPricing.cookingLossPercent);

  const addSubcategory = () => {
    onSubcategoriesChange([
      ...subcategories,
      { name: "Novo item", costPerKg: 10, cookingLossPercent: 0, keywords: [] },
    ]);
  };

  const updateSub = (idx: number, item: SubcategoryItem) => {
    onSubcategoriesChange(subcategories.map((s, i) => (i === idx ? item : s)));
  };

  const removeSub = (idx: number) => {
    onSubcategoriesChange(subcategories.filter((_, i) => i !== idx));
  };

  if (subcategories.length === 0) {
    // No subcategories (e.g. veggie) - show simple row
    const costPerGram = getCostPerGram(fallbackPricing.costPerKg, fallbackPricing.cookingLossPercent);
    const fc = fallbackPricing.cookingLossPercent >= 100 ? 1 : 1 / (1 - fallbackPricing.cookingLossPercent / 100);
    return (
      <TableRow>
        <TableCell className="font-medium">
          <span className="text-base mr-1">{emoji}</span> {label}
        </TableCell>
        <TableCell className="text-muted-foreground text-xs" colSpan={2}>—</TableCell>
        <TableCell className="text-right text-xs text-muted-foreground">{fc.toFixed(2)}</TableCell>
        <TableCell className="text-right font-medium text-primary text-sm">R$ {costPerGram.toFixed(4)}</TableCell>
        <TableCell />
      </TableRow>
    );
  }

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="font-medium">
          <span className="flex items-center gap-1">
            <span className="text-base mr-1">{emoji}</span> {label}
            <span className="text-xs text-muted-foreground ml-1">({subcategories.length})</span>
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </span>
        </TableCell>
        <TableCell colSpan={2} className="text-xs text-muted-foreground">
          {subcategories.length} subcategorias
        </TableCell>
        <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
        <TableCell className="text-right font-medium text-primary text-sm">
          ~ R$ {avgCostPerGram.toFixed(4)}
        </TableCell>
        <TableCell />
      </TableRow>
      {expanded && (
        <>
          {subcategories.map((sub, idx) => (
            <SubcategoryRow
              key={idx}
              item={sub}
              onChange={(item) => updateSub(idx, item)}
              onRemove={() => removeSub(idx)}
              canRemove={subcategories.length > 1}
            />
          ))}
          <TableRow className="bg-muted/20">
            <TableCell colSpan={6} className="pl-8">
              <Button variant="ghost" size="sm" onClick={addSubcategory} className="text-xs h-7">
                <Plus className="w-3 h-3 mr-1" /> Adicionar {label.toLowerCase()}
              </Button>
            </TableCell>
          </TableRow>
        </>
      )}
    </>
  );
}

export default function PricingConfig({ settings, onChange, onSave, saving }: PricingConfigProps) {
  const [open, setOpen] = useState(false);

  const update = (partial: Partial<PricingSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const updateSubcategories = (category: keyof SubcategoryPricing, items: SubcategoryItem[]) => {
    update({
      subcategoryPricing: {
        ...settings.subcategoryPricing,
        [category]: items,
      },
    });
  };

  const updatePackage = (idx: number, field: keyof PackageOption, value: any) => {
    const updated = settings.packageOptions.map((p, i) =>
      i === idx ? { ...p, [field]: value } : p
    );
    update({ packageOptions: updated });
  };

  const addPackage = () => {
    const last = settings.packageOptions[settings.packageOptions.length - 1];
    update({
      packageOptions: [
        ...settings.packageOptions,
        { days: (last?.days || 7) + 7, label: `${(last?.days || 7) + 7} dias`, discount: 0 },
      ],
    });
  };

  const removePackage = (idx: number) => {
    update({ packageOptions: settings.packageOptions.filter((_, i) => i !== idx) });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Regras de Precificação
              </span>
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Bloco A - Tabela de Insumos por Subcategoria */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">🥩 Tabela de Insumos</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Preços e cocção por subcategoria. Atualize quando houver reajuste do fornecedor.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria / Subcategoria</TableHead>
                    <TableHead className="w-28">Preço/kg cru</TableHead>
                    <TableHead className="w-24">Cocção (%)</TableHead>
                    <TableHead className="w-16 text-right">FC</TableHead>
                    <TableHead className="w-28 text-right">Custo/g real</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <CategoryGroup
                    label="Proteína"
                    emoji="🥩"
                    category="protein"
                    subcategories={settings.subcategoryPricing.protein}
                    fallbackPricing={settings.proteinPricing}
                    onSubcategoriesChange={(items) => updateSubcategories("protein", items)}
                  />
                  <CategoryGroup
                    label="Carboidrato"
                    emoji="🍚"
                    category="carb"
                    subcategories={settings.subcategoryPricing.carb}
                    fallbackPricing={settings.carbPricing}
                    onSubcategoriesChange={(items) => updateSubcategories("carb", items)}
                  />
                  <CategoryGroup
                    label="Mix de Legumes"
                    emoji="🥦"
                    category="veggie"
                    subcategories={settings.subcategoryPricing.veggie}
                    fallbackPricing={settings.veggiePricing}
                    onSubcategoriesChange={(items) => updateSubcategories("veggie", items)}
                  />
                </TableBody>
              </Table>
            </div>

            {/* Bloco B - Custos Fixos */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">📦 Custos Fixos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Embalagem (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.packagingCost}
                    onChange={(e) => update({ packagingCost: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Marmita + tampa + etiqueta</p>
                </div>
                <div>
                  <Label className="text-xs">Custo fixo por refeição (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.fixedCostPerMeal}
                    onChange={(e) => update({ fixedCostPerMeal: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Gás, mão de obra, etc</p>
                </div>
              </div>
            </div>

            {/* Bloco C - Margem */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">📊 Preço de Venda</h4>
              <div className="flex items-center gap-3 mb-3">
                <Switch
                  checked={settings.pricingMode === "margin"}
                  onCheckedChange={(checked) =>
                    update({ pricingMode: checked ? "margin" : "manual" })
                  }
                />
                <span className="text-sm">
                  {settings.pricingMode === "margin"
                    ? "Calcular pelo custo + margem"
                    : "Definir preço manual por grama"}
                </span>
              </div>

              {settings.pricingMode === "margin" ? (
                <div className="max-w-xs">
                  <Label className="text-xs">Margem de lucro (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={settings.marginPercent}
                    onChange={(e) => update({ marginPercent: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 100% = vende pelo dobro do custo
                  </p>
                </div>
              ) : (
                <div className="max-w-xs">
                  <Label className="text-xs">Preço por grama (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.manualPricePerGram}
                    onChange={(e) =>
                      update({ manualPricePerGram: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              )}
            </div>

            {/* Bloco D - Pacotes */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">📦 Pacotes</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Dias</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-28">Desconto (%)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.packageOptions.map((pkg, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={pkg.days}
                          onChange={(e) => updatePackage(idx, "days", parseInt(e.target.value) || 1)}
                          className="w-16 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={pkg.label}
                          onChange={(e) => updatePackage(idx, "label", e.target.value)}
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={Math.round(pkg.discount * 100)}
                          onChange={(e) =>
                            updatePackage(idx, "discount", (parseFloat(e.target.value) || 0) / 100)
                          }
                          className="w-20 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        {settings.packageOptions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePackage(idx)}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addPackage} className="mt-2">
                <Plus className="w-3 h-3 mr-1" /> Adicionar pacote
              </Button>
            </div>

            {/* Bloco E - Salvar */}
            <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar como padrão
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export { getCostPerGram };
