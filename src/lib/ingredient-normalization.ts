// Shared ingredient normalization utilities for production and printing

const GENERIC_VEGGIE_NAMES = new Set([
  'mix de legumes', 'legumes', 'mix de salada', 'salada',
  'mix variado', 'legumes variados', 'mix legumes', 'salada mix',
  'mix salada', 'legumes mix', 'legumes cozidos', 'mix de salada verde',
]);

const stripAccents = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Unifies generic veggie/salad names into "Mix de legumes".
 * Specific names (e.g. "Brócolis", "Cenoura") are kept as-is.
 */
export const normalizeVeggieName = (name: string): string => {
  const norm = stripAccents(name);
  return GENERIC_VEGGIE_NAMES.has(norm) ? 'Mix de legumes' : name;
};

/**
 * Normalizes protein names from custom diets for clarity.
 * e.g. "carne em cubos" → "Carne bovina em cubos"
 */
export const normalizeProteinName = (name: string): string => {
  const lower = name.toLowerCase().trim();

  // "carne em cubos" → "Carne bovina em cubos"
  if (/^carne\s+(em\s+)?cubos$/i.test(lower)) return 'Carne bovina em cubos';
  if (/^carne\s+mo[ií]da$/i.test(lower)) return 'Carne bovina moída';
  if (/^carne\s+desfiada$/i.test(lower)) return 'Carne bovina desfiada';
  if (/^carne$/i.test(lower)) return 'Carne bovina';

  // "frango cubos" → "Frango em cubos"
  if (/^frango\s+cubos$/i.test(lower)) return 'Frango em cubos';

  // Capitalise first letter if none of the above matched
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Classify ingredient for grouping (reusable keywords)
const PROTEIN_KW = ['carne', 'frango', 'peixe', 'tilápia', 'tilapia', 'almôndega', 'almondega', 'linguiça', 'linguica', 'bacon', 'calabresa', 'costela', 'cupim', 'charque', 'pernil', 'lombo', 'bisteca', 'filé', 'file', 'estrogonofe', 'strogonoff', 'bovina'];
const CARB_KW = ['arroz', 'aipim', 'batata', 'purê', 'pure', 'feijão', 'feijao', 'grãos', 'graos', 'macarrão', 'macarrao', 'nhoque', 'mandioca', 'farinha', 'risoto', 'molho'];

/**
 * Normalizes generic carb names like "grãos" to their actual name.
 * If the name is too generic, returns a more specific default.
 */
export const normalizeCarbName = (name: string): string => {
  const norm = stripAccents(name);
  if (norm === 'graos' || norm === 'grao' || norm === 'grao de bico') return 'Grão de Bico';
  return name;
};

export const classifyIngredientName = (name: string): 'protein' | 'carb' | 'salad' => {
  const lower = stripAccents(name);
  if (PROTEIN_KW.some(k => lower.includes(stripAccents(k)))) return 'protein';
  if (CARB_KW.some(k => lower.includes(stripAccents(k)))) return 'carb';
  return 'salad';
};
