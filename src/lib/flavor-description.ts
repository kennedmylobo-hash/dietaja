import { Json } from "@/integrations/supabase/types";

export interface FlavorSideItem {
  name: string;
  weight: number;
}

export interface FlavorSidesByLine {
  fit?: FlavorSideItem[];
  fitness?: FlavorSideItem[];
}

/**
 * Maps line_type from marmita_packages (emagrecimento/hipertrofia) to JSONB key (fit/fitness)
 */
export const mapLineTypeToKey = (lineType: string): 'fit' | 'fitness' => {
  if (lineType === 'hipertrofia') return 'fitness';
  return 'fit';
};

/**
 * Parses the sides JSONB field into a typed structure
 */
export const parseSides = (sides: Json | null): FlavorSidesByLine | null => {
  if (!sides || typeof sides !== 'object' || Array.isArray(sides)) return null;
  
  const parsed = sides as Record<string, unknown>;
  const result: FlavorSidesByLine = {};
  
  for (const key of ['fit', 'fitness'] as const) {
    if (Array.isArray(parsed[key])) {
      result[key] = (parsed[key] as any[]).filter(
        (item) => item && typeof item.name === 'string' && typeof item.weight === 'number'
      );
    }
  }
  
  return (result.fit || result.fitness) ? result : null;
};

/**
 * Gets the composition items for a specific line
 */
export const getFlavorSidesForLine = (
  sides: Json | null,
  lineType: 'fit' | 'fitness'
): FlavorSideItem[] | null => {
  const parsed = parseSides(sides);
  if (!parsed) return null;
  const items = parsed[lineType];
  return items && items.length > 0 ? items : null;
};

/**
 * Generates a human-readable description from the sides JSONB
 * e.g. "100g Carne moída + 150g Aipim + 50g Mix de salada"
 */
export const getFlavorDescription = (
  sides: Json | null,
  lineType: 'fit' | 'fitness'
): string | null => {
  const items = getFlavorSidesForLine(sides, lineType);
  if (!items || items.length === 0) return null;
  
  return items.map((item) => `${item.weight}g ${item.name}`).join(' + ');
};

/**
 * Calculates total weight from composition items
 */
export const getTotalWeight = (items: FlavorSideItem[]): number => {
  return items.reduce((sum, item) => sum + item.weight, 0);
};
