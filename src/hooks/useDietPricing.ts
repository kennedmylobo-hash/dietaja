import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "@/hooks/use-toast";
import type { PricingSettings, PackageOption } from "@/components/admin/diet-pricing/PricingConfig";

const DEFAULT_PACKAGES: PackageOption[] = [
  { days: 7, label: "7 dias", discount: 0 },
  { days: 14, label: "14 dias", discount: 0.05 },
  { days: 21, label: "21 dias", discount: 0.08 },
  { days: 28, label: "28 dias", discount: 0.10 },
];

const DEFAULT_SETTINGS: PricingSettings = {
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
        setSettings({
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
    (item: { totalWeight: number; priceOverride: number | null }) => {
      if (item.priceOverride !== null && item.priceOverride > 0) return item.priceOverride;
      if (settings.pricingMode === "margin") {
        const cost =
          item.totalWeight * settings.costPerGram +
          settings.packagingCost +
          settings.fixedCostPerMeal;
        return cost * (1 + settings.marginPercent / 100);
      }
      return item.totalWeight * settings.manualPricePerGram;
    },
    [settings]
  );

  const getItemCost = useCallback(
    (item: { totalWeight: number }) => {
      return (
        item.totalWeight * settings.costPerGram +
        settings.packagingCost +
        settings.fixedCostPerMeal
      );
    },
    [settings]
  );

  return { settings, setSettings, save, saving, loaded, getItemPrice, getItemCost };
}
