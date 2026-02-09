import { getCostPerGram } from "@/components/admin/diet-pricing/PricingConfig";
import type { CategoryPricing } from "@/components/admin/diet-pricing/PricingConfig";

export interface SubcategoryItem {
  name: string;
  costPerKg: number;
  cookingLossPercent: number;
  keywords: string[];
}

export interface SubcategoryPricing {
  protein: SubcategoryItem[];
  carb: SubcategoryItem[];
  veggie: SubcategoryItem[];
}

export const DEFAULT_SUBCATEGORY_PRICING: SubcategoryPricing = {
  protein: [
    { name: "Filé de peito", costPerKg: 25, cookingLossPercent: 25, keywords: ["frango", "peito", "filé", "file", "grelhado", "empanado", "desfiado"] },
    { name: "Carne bovina", costPerKg: 35, cookingLossPercent: 35, keywords: ["carne", "bovina", "bovino", "patinho", "alcatra", "picanha", "acém", "acem", "moída", "moida", "cubos", "strogonoff", "estrogonofe"] },
    { name: "Carne suína", costPerKg: 28, cookingLossPercent: 30, keywords: ["porco", "suíno", "suino", "linguiça", "linguica", "costela"] },
    { name: "Peixe", costPerKg: 40, cookingLossPercent: 20, keywords: ["peixe", "tilápia", "tilapia", "salmão", "salmon", "atum", "camarão", "camarao"] },
  ],
  carb: [
    { name: "Arroz", costPerKg: 6, cookingLossPercent: 0, keywords: ["arroz"] },
    { name: "Aipim", costPerKg: 10, cookingLossPercent: 10, keywords: ["aipim", "mandioca"] },
    { name: "Batata doce", costPerKg: 8, cookingLossPercent: 10, keywords: ["batata"] },
    { name: "Macarrão", costPerKg: 7, cookingLossPercent: 0, keywords: ["macarrão", "macarrao", "massa", "espaguete", "penne", "fusilli", "lasanha", "nhoque"] },
    { name: "Feijão", costPerKg: 6, cookingLossPercent: 0, keywords: ["feijão", "feijao"] },
  ],
  veggie: [],
};

/**
 * Find the best matching subcategory for an ingredient name.
 * Returns the specific cost per gram, or falls back to the category-level pricing.
 */
/**
 * Find the best matching subcategory name for an ingredient.
 */
export function matchSubcategoryName(
  ingredientName: string,
  category: "protein" | "carb" | "veggie",
  subcategories: SubcategoryPricing
): string | null {
  const lower = ingredientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const subs = subcategories[category];
  if (!subs || subs.length === 0) return null;

  let bestMatch: SubcategoryItem | null = null;
  let bestScore = 0;

  for (const sub of subs) {
    let score = 0;
    for (const kw of sub.keywords) {
      const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(kwNorm)) {
        score += kwNorm.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = sub;
    }
  }

  return bestMatch?.name || null;
}

/**
 * Find the best matching subcategory for an ingredient name.
 * Returns the specific cost per gram, or falls back to the category-level pricing.
 */
export function getSubcategoryCostPerGram(
  ingredientName: string,
  category: "protein" | "carb" | "veggie",
  subcategories: SubcategoryPricing,
  fallback: CategoryPricing
): number {
  const lower = ingredientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const subs = subcategories[category];

  if (subs && subs.length > 0) {
    let bestMatch: SubcategoryItem | null = null;
    let bestScore = 0;

    for (const sub of subs) {
      let score = 0;
      for (const kw of sub.keywords) {
        const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (lower.includes(kwNorm)) {
          score += kwNorm.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = sub;
      }
    }

    if (bestMatch) {
      return getCostPerGram(bestMatch.costPerKg, bestMatch.cookingLossPercent);
    }
  }

  // Fallback to category-level pricing
  return getCostPerGram(fallback.costPerKg, fallback.cookingLossPercent);
}
