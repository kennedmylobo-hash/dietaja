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

export interface PricingSettings {
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

export default function PricingConfig({ settings, onChange, onSave, saving }: PricingConfigProps) {
  const [open, setOpen] = useState(false);

  const update = (partial: Partial<PricingSettings>) => {
    onChange({ ...settings, ...partial });
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
            {/* Bloco A - Custos de Ingredientes */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">🥩 Custo dos Ingredientes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Preço do kg cru (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.rawCostPerKg}
                    onChange={(e) => {
                      const rawCost = parseFloat(e.target.value) || 0;
                      const costPerGram = (rawCost / 1000) * settings.correctionFactor;
                      update({ rawCostPerKg: rawCost, costPerGram });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Média ponderada dos ingredientes</p>
                </div>
                <div>
                  <Label className="text-xs">Perda na cocção (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="90"
                    value={settings.cookingLossPercent}
                    onChange={(e) => {
                      const loss = parseFloat(e.target.value) || 0;
                      const fc = loss >= 100 ? 1 : 1 / (1 - loss / 100);
                      const costPerGram = (settings.rawCostPerKg / 1000) * fc;
                      update({ cookingLossPercent: loss, correctionFactor: parseFloat(fc.toFixed(4)), costPerGram });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Peso que perde ao cozinhar</p>
                </div>
                <div>
                  <Label className="text-xs">Fator de Correção (FC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={settings.correctionFactor}
                    onChange={(e) => {
                      const fc = parseFloat(e.target.value) || 1;
                      const loss = fc > 0 ? (1 - 1 / fc) * 100 : 0;
                      const costPerGram = (settings.rawCostPerKg / 1000) * fc;
                      update({ correctionFactor: fc, cookingLossPercent: parseFloat(loss.toFixed(1)), costPerGram });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Peso bruto ÷ peso líquido</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-muted/60 rounded-lg border text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo bruto/grama:</span>
                  <span>R$ {(settings.rawCostPerKg / 1000).toFixed(4)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Custo real/grama (após cocção):</span>
                  <span className="text-primary">R$ {settings.costPerGram.toFixed(4)}</span>
                </div>
              </div>
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

            {/* Bloco B - Margem */}
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

            {/* Bloco C - Pacotes */}
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

            {/* Bloco D - Salvar */}
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
