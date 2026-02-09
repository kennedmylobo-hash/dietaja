import { useMemo } from "react";
import { useDietPricing } from "@/hooks/useDietPricing";
import { getCostPerGram } from "@/components/admin/diet-pricing/PricingConfig";
import type { Json } from "@/integrations/supabase/types";

interface FlavorItem {
  name: string;
  quantity: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
  lineType?: string;
  flavors?: FlavorItem[];
}

interface SidesEntry {
  name: string;
  weight: number;
}

interface SidesData {
  fit?: SidesEntry[];
  fitness?: SidesEntry[];
}

// Classify ingredient name into protein/carb/veggie
const PROTEIN_KEYWORDS = [
  "carne", "bovina", "bovino", "frango", "peixe", "tilápia", "tilapia", "salmão",
  "camarão", "ovo", "atum", "hambúrguer", "hamburguer", "strogonoff", "filé", "file",
  "linguiça", "linguica", "costela", "porco", "suíno", "suino", "picanha", "alcatra",
  "grão de bico", "grao de bico", "lentilha", "tofu", "proteína", "proteina",
  "empanado", "grelhado", "desfiado", "moída", "moida",
];

const VEGGIE_KEYWORDS = [
  "legume", "legumes", "brócolis", "brocolis", "cenoura", "abobrinha", "abóbora",
  "vagem", "espinafre", "couve", "berinjela", "salada", "mix", "variado",
  "beterraba", "chuchu", "quiabo",
];

function classifySide(name: string): "protein" | "carb" | "veggie" {
  const lower = name.toLowerCase();
  for (const kw of PROTEIN_KEYWORDS) {
    if (lower.includes(kw)) return "protein";
  }
  for (const kw of VEGGIE_KEYWORDS) {
    if (lower.includes(kw)) return "veggie";
  }
  return "carb";
}

export interface OrderCostResult {
  totalCost: number;
  totalRevenue: number;
  profit: number;
  marginPercent: number;
}

/**
 * Calculate cost for a single order's items using flavor composition data
 * and tenant pricing settings.
 */
export function calculateOrderCost(
  items: OrderItem[],
  flavorSidesMap: Record<string, Json | null>,
  settings: ReturnType<typeof useDietPricing>["settings"]
): OrderCostResult {
  const protCostPerGram = getCostPerGram(settings.proteinPricing.costPerKg, settings.proteinPricing.cookingLossPercent);
  const carbCostPerGram = getCostPerGram(settings.carbPricing.costPerKg, settings.carbPricing.cookingLossPercent);
  const veggieCostPerGram = getCostPerGram(settings.veggiePricing.costPerKg, settings.veggiePricing.cookingLossPercent);

  let totalCost = 0;
  let totalRevenue = 0;

  for (const item of items) {
    totalRevenue += item.totalPrice;

    if (item.type !== "marmita" || !item.flavors?.length) continue;

    const lineType = item.lineType === "hipertrofia" || item.lineType === "fitness"
      || /hipertrofia|fitness/i.test(item.name)
      ? "fitness" : "fit";

    for (const flavor of item.flavors) {
      const sidesData = findSidesData(flavor.name, flavorSidesMap);
      if (!sidesData) continue;

      const sides = (sidesData as SidesData)?.[lineType as keyof SidesData] as SidesEntry[] | undefined;
      if (!sides?.length) continue;

      let flavorCost = 0;
      for (const side of sides) {
        const cat = classifySide(side.name);
        const costPerGram = cat === "protein" ? protCostPerGram : cat === "veggie" ? veggieCostPerGram : carbCostPerGram;
        flavorCost += side.weight * costPerGram;
      }

      flavorCost += settings.packagingCost + settings.fixedCostPerMeal;
      totalCost += flavorCost * (flavor.quantity || 1);
    }
  }

  const profit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return { totalCost, totalRevenue, profit, marginPercent };
}

function findSidesData(
  flavorName: string,
  flavorSidesMap: Record<string, Json | null>
): Json | null {
  if (flavorSidesMap[flavorName]) return flavorSidesMap[flavorName];

  const stopWords = new Set(["com", "de", "e", "em", "ao", "a", "o", "mix", "da", "do"]);
  const extractWords = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[\s,]+/).filter(w => w.length > 1 && !stopWords.has(w));

  const targetWords = extractWords(flavorName);
  let bestMatch = "";
  let bestScore = 0;

  for (const key of Object.keys(flavorSidesMap)) {
    const keyWords = extractWords(key);
    const overlap = targetWords.filter(w => keyWords.includes(w)).length;
    const score = overlap / Math.max(targetWords.length, keyWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = key;
    }
  }

  return bestMatch ? flavorSidesMap[bestMatch] : null;
}

/**
 * Hook that provides the pricing settings and calculator function.
 * Use calculateOrderCost directly with the settings from this hook.
 */
export function useOrderCostCalculator() {
  const { settings, loaded } = useDietPricing();
  return { settings, loaded, calculateOrderCost };
}
