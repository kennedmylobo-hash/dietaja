import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "@/hooks/use-toast";
import type { PricingSettings, PackageOption } from "@/components/admin/diet-pricing/PricingConfig";
import { getCostPerGram } from "@/components/admin/diet-pricing/PricingConfig";
import { DEFAULT_SUBCATEGORY_PRICING, getSubcategoryCostPerGram } from "@/lib/subcategory-pricing";
import type { SubcategoryPricing } from "@/lib/subcategory-pricing";

const DEFAULT_PACKAGES: PackageOption[] = [
  { days: 10, label: "10 marmitas", discount: 0 },
  { days: 20, label: "20 marmitas", discount: 0.05 },
  { days: 30, label: "30 marmitas", discount: 0.10 },
];

const DEFAULT_SETTINGS: PricingSettings = {
  proteinPricing: { costPerKg: 30.00, cookingLossPercent: 30 },
  carbPricing: { costPerKg: 8.00, cookingLossPercent: 0 },
  veggiePricing: { costPerKg: 12.00, cookingLossPercent: 15 },
  subcategoryPricing: DEFAULT_SUBCATEGORY_PRICING,
  rawCostPerKg: 20.00,
  cookingLossPercent: 30,
  correctionFactor: 1.43,
  costPerGram: 0.0286,
  packagingCost: 1.50,
  fixedCostPerMeal: 2.00,
  pricingMode: "margin",
  marginPercent: 100,
  manualPricePerGram: 0.08,
  packageOptions: DEFAULT_PACKAGES,
};

interface QuoteItemWeights {
  proteinWeight: number;
  carbWeight: number;
  veggieWeight: number;
  totalWeight: number;
  priceOverride: number | null;
}

export function useDietPricing() {
  const tenantId = useTenantId();
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tenant_diet_pricing" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        const subPricing = d.subcategory_pricing as SubcategoryPricing | null;
        setSettings({
          proteinPricing: {
            costPerKg: d.protein_cost_per_kg ?? 30,
            cookingLossPercent: d.protein_cooking_loss ?? 30,
          },
          carbPricing: {
            costPerKg: d.carb_cost_per_kg ?? 8,
            cookingLossPercent: d.carb_cooking_loss ?? 0,
          },
          veggiePricing: {
            costPerKg: d.veggie_cost_per_kg ?? 12,
            cookingLossPercent: d.veggie_cooking_loss ?? 15,
          },
          subcategoryPricing: subPricing && subPricing.protein ? subPricing : DEFAULT_SUBCATEGORY_PRICING,
          rawCostPerKg: d.raw_cost_per_kg ?? DEFAULT_SETTINGS.rawCostPerKg,
          cookingLossPercent: d.cooking_loss_percent ?? DEFAULT_SETTINGS.cookingLossPercent,
          correctionFactor: d.correction_factor ?? DEFAULT_SETTINGS.correctionFactor,
          costPerGram: d.cost_per_gram ?? DEFAULT_SETTINGS.costPerGram,
          packagingCost: d.packaging_cost ?? DEFAULT_SETTINGS.packagingCost,
          fixedCostPerMeal: d.fixed_cost_per_meal ?? DEFAULT_SETTINGS.fixedCostPerMeal,
          pricingMode: d.pricing_mode ?? DEFAULT_SETTINGS.pricingMode,
          marginPercent: d.margin_percent ?? DEFAULT_SETTINGS.marginPercent,
          manualPricePerGram: d.manual_price_per_gram ?? DEFAULT_SETTINGS.manualPricePerGram,
          packageOptions: (d.package_options as PackageOption[]) ?? DEFAULT_PACKAGES,
        });
      }
      setLoaded(true);
    };
    load();
  }, [tenantId]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        raw_cost_per_kg: settings.rawCostPerKg,
        cooking_loss_percent: settings.cookingLossPercent,
        correction_factor: settings.correctionFactor,
        cost_per_gram: settings.costPerGram,
        packaging_cost: settings.packagingCost,
        fixed_cost_per_meal: settings.fixedCostPerMeal,
        pricing_mode: settings.pricingMode,
        margin_percent: settings.marginPercent,
        manual_price_per_gram: settings.manualPricePerGram,
        package_options: settings.packageOptions as any,
        protein_cost_per_kg: settings.proteinPricing.costPerKg,
        protein_cooking_loss: settings.proteinPricing.cookingLossPercent,
        carb_cost_per_kg: settings.carbPricing.costPerKg,
        carb_cooking_loss: settings.carbPricing.cookingLossPercent,
        veggie_cost_per_kg: settings.veggiePricing.costPerKg,
        veggie_cooking_loss: settings.veggiePricing.cookingLossPercent,
        subcategory_pricing: settings.subcategoryPricing as any,
      };

      const { error } = await supabase
        .from("tenant_diet_pricing" as any)
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) throw error;
      toast({ title: "Configurações salvas!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [settings, tenantId]);

  const getItemPrice = useCallback(
    (item: QuoteItemWeights) => {
      if (item.priceOverride !== null && item.priceOverride > 0) return item.priceOverride;
      if (settings.pricingMode === "margin") {
        const cost = getItemCostInternal(item);
        return cost * (1 + settings.marginPercent / 100);
      }
      return item.totalWeight * settings.manualPricePerGram;
    },
    [settings]
  );

  const getItemCostInternal = useCallback(
    (item: QuoteItemWeights) => {
      const proteinCost = item.proteinWeight * getCostPerGram(settings.proteinPricing.costPerKg, settings.proteinPricing.cookingLossPercent);
      const carbCost = item.carbWeight * getCostPerGram(settings.carbPricing.costPerKg, settings.carbPricing.cookingLossPercent);
      const veggieCost = item.veggieWeight * getCostPerGram(settings.veggiePricing.costPerKg, settings.veggiePricing.cookingLossPercent);
      return proteinCost + carbCost + veggieCost + settings.packagingCost + settings.fixedCostPerMeal;
    },
    [settings]
  );

  const getItemCost = useCallback(
    (item: QuoteItemWeights) => getItemCostInternal(item),
    [getItemCostInternal]
  );

  return { settings, setSettings, save, saving, loaded, getItemPrice, getItemCost };
}
