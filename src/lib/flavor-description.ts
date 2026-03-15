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
  if (lineType === 'hipertrofia' || lineType === 'fitness') return 'fitness';
  return 'fit';
};

/**
 * Parses the sides JSONB field into a typed structure
 */
export const parseSides = (sides: Json | null): FlavorSidesByLine | null => {
  if (!sides || typeof sides !== 'object' || Array.isArray(sides)) return null;
  
  const parsed = sides as Record<string, unknown>;
  const result: FlavorSidesByLine = {};
  
  // Support both canonical keys (fit/fitness) and legacy keys (emagrecimento/hipertrofia)
  const keyMap: Record<string, 'fit' | 'fitness'> = {
    fit: 'fit',
    emagrecimento: 'fit',
    fitness: 'fitness',
    hipertrofia: 'fitness',
  };

  for (const [rawKey, canonicalKey] of Object.entries(keyMap)) {
    if (Array.isArray(parsed[rawKey]) && !result[canonicalKey]) {
      result[canonicalKey] = (parsed[rawKey] as any[]).filter(
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

// ── Auto-generation helpers ──

const KNOWN_PROTEINS: [RegExp, string][] = [
  [/carne\s+mo[ií]da/i, 'Carne moída'],
  [/carne\s+desfiad/i, 'Carne desfiada'],
  [/carne\s+(em\s+)?cubos/i, 'Carne em cubos'],
  [/carne\s+bovina/i, 'Carne bovina'],
  [/frango\s+desfiad/i, 'Frango desfiado'],
  [/frango\s+grelhad/i, 'Frango grelhado'],
  [/frango\s+grlhad/i, 'Frango grelhado'],
  [/frango\s+(em\s+)?cubos/i, 'Frango em cubos'],
  [/frango\s+empan/i, 'Frango empanado'],
  [/estrogonofe\s+de\s+carne/i, 'Estrogonofe de carne'],
  [/estrogonofe\s+de\s+frango/i, 'Estrogonofe de frango'],
  [/strogonoff\s+de\s+carne/i, 'Estrogonofe de carne'],
  [/strogonoff\s+de\s+frango/i, 'Estrogonofe de frango'],
  [/alm[oô]ndega/i, 'Almôndega'],
  [/almodeng/i, 'Almôndega'],
  [/fil[eé]\s+de\s+peixe/i, 'Filé de peixe'],
  [/til[aá]pia/i, 'Tilápia'],
  [/peixe/i, 'Peixe'],
  [/lingui[çc]a/i, 'Linguiça'],
  [/calabresa/i, 'Calabresa'],
  [/costela/i, 'Costela'],
  [/cupim/i, 'Cupim'],
];

const extractProteinName = (itemName: string, isEscondidinho = false): string => {
  const lower = itemName.toLowerCase();
  const cleaned = lower.replace(/escondidinho\s+de\s+/i, '');

  // Try known protein patterns first (most specific)
  for (const [pattern, label] of KNOWN_PROTEINS) {
    if (pattern.test(cleaned)) {
      if (isEscondidinho) {
        if (label.toLowerCase().includes('frango')) return 'Frango desfiado';
        if (label.toLowerCase().includes('carne') && !label.includes('desfiada')) return 'Carne moída';
      }
      return label;
    }
  }

  // Fallback: first word-group before "com" / "e" / ","
  const part = cleaned.split(/[,]|\s+com\s+|\s+e\s+/)[0].trim();
  let protein = part.charAt(0).toUpperCase() + part.slice(1);

  // Generic single-word fallbacks for escondidinho
  if (isEscondidinho) {
    if (/frango/i.test(protein)) return 'Frango desfiado';
    if (/carne/i.test(protein)) return 'Carne moída';
  }

  // If the fallback captured too much (contains carb keywords), trim it
  const carbWords = ['arroz', 'aipim', 'batata', 'pure', 'purê', 'macarr'];
  for (const cw of carbWords) {
    const idx = protein.toLowerCase().indexOf(cw);
    if (idx > 0) {
      protein = protein.substring(0, idx).trim();
      break;
    }
  }

  return protein.charAt(0).toUpperCase() + protein.slice(1);
};

const extractCarbName = (itemName: string): string => {
  const lower = itemName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Purê variants — detect what comes after "purê/pure de"
  const pureMatch = lower.match(/pur[eê]\s+de\s+(abobora|abobrinha|batata[\s-]*doce|batata|aipim|mandioca|macaxeira)/);
  if (pureMatch) {
    const base = pureMatch[1];
    if (base.includes('abobora') || base.includes('abobrinha')) return 'Purê de abóbora';
    if (base.includes('batata')) return 'Purê de batata doce';
    return 'Purê de aipim';
  }
  // Standalone "purê"/"pure" without specifier
  if (/pur[eê]/i.test(lower)) return 'Purê de aipim';

  // Specific carb keywords (order matters: more specific first)
  const carbs: [string, string][] = [
    ['batata-doce', 'Batata-doce'], ['batata doce', 'Batata-doce'], ['batata', 'Batata-doce'],
    ['aipim', 'Aipim'], ['mandioca', 'Aipim'], ['macaxeira', 'Aipim'],
    ['abobora', 'Abóbora'],
    ['arroz integra', 'Arroz integral'], ['arroz integral', 'Arroz integral'], ['arroz', 'Arroz'],
    ['macarrao', 'Macarrão'], ['nhoque', 'Nhoque'],
    ['feijao', 'Feijão'],
  ];
  for (const [key, label] of carbs) {
    if (lower.includes(key)) return label;
  }
  return 'Aipim';
};

/**
 * For escondidinho, any carb must be in purê form.
 */
const toPureForm = (carbName: string): string => {
  const lower = carbName.toLowerCase();
  if (lower.startsWith('purê')) return carbName;
  if (lower.includes('aipim') || lower.includes('mandioca')) return 'Purê de aipim';
  if (lower.includes('batata')) return 'Purê de batata doce';
  if (lower.includes('abóbora') || lower.includes('abobora')) return 'Purê de abóbora';
  return `Purê de ${carbName.toLowerCase()}`;
};

const normalizeForMatch = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export const enforceEscondidinhoComposition = (
  itemName: string,
  line: 'fit' | 'fitness',
  currentSides: FlavorSideItem[]
): FlavorSideItem[] => {
  const normalizedName = normalizeForMatch(itemName);
  const isEscondidinho = /escondidinho|esondidinho/.test(normalizedName);
  if (!isEscondidinho) return currentSides;

  const isFrango = normalizedName.includes('frango');
  const proteinName = isFrango ? 'Frango desfiado' : 'Carne moída';

  let pureName = 'Purê de aipim';
  if (normalizedName.includes('abobora') || normalizedName.includes('abobrinha')) pureName = 'Purê de abóbora';
  else if (/batata[\s-]*doce/.test(normalizedName)) pureName = 'Purê de batata doce';

  // Detect mix: catch typos like "mxi", "miz", or just "salada"/"legumes" in escondidinho names
  const hasMixInName = /m[ixz]{2}\s+de\s+(salada|legumes)/i.test(normalizedName)
    || (/salada/.test(normalizedName) && !normalizedName.includes('pure'))
    || /legumes/.test(normalizedName);
  const mixSide = currentSides.find(s => /mix/i.test(normalizeForMatch(s.name)));
  const mixName = mixSide?.name || (normalizedName.includes('legumes') ? 'Mix de legumes' : 'Mix de salada');

  if (hasMixInName || !!mixSide) {
    return line === 'fitness'
      ? [
          { name: proteinName, weight: 150 },
          { name: pureName, weight: 200 },
          { name: mixName, weight: 100 },
        ]
      : [
          { name: proteinName, weight: 100 },
          { name: pureName, weight: 150 },
          { name: mixName, weight: 50 },
        ];
  }

  return line === 'fitness'
    ? [{ name: proteinName, weight: 175 }, { name: pureName, weight: 275 }]
    : [{ name: proteinName, weight: 120 }, { name: pureName, weight: 180 }];
};

const parseAllIngredients = (itemName: string): string[] => {
  const lower = itemName.toLowerCase();
  const cleaned = lower.replace(/escondidinho\s+de\s+/i, '');
  const parts = cleaned.split(/[,]|\s+com\s+|\s+e\s+/).map(p => p.trim()).filter(Boolean);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
};

/**
 * Generates a reasonable default composition from an item name when
 * the flavor has no configured sides in the DB.
 */
export const generateDefaultSides = (itemName: string, line: 'fit' | 'fitness'): FlavorSideItem[] => {
  const lower = itemName.toLowerCase();
  const isEscondidinho = lower.includes('escondidinho');
  const isMacarronada = lower.includes('macarronada') || lower.includes('macarrão');
  const allParts = parseAllIngredients(itemName);
  const protein = extractProteinName(itemName, isEscondidinho) || allParts[0] || 'Proteína';

  if (isEscondidinho) {
    const carb = extractCarbName(itemName);
    const carbLabel = toPureForm(carb);
    const carbNorm = carb.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const extras: string[] = [];
    if (/m[ixz]{1,2}\s+de\s+(salada|legumes)/i.test(lower) || (/salada/.test(lower) && !/pure/.test(lower)) || /legumes/.test(lower)) {
      extras.push(lower.includes('legumes') ? 'Mix de legumes' : 'Mix de salada');
    }
    for (const part of allParts.slice(1)) {
      const partLower = part.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Skip the carb ingredient (already handled as purê)
      if (partLower.includes('aipim') || partLower.includes('pure') || partLower.includes('mandioca')) continue;
      if (partLower.includes('batata')) continue;
      if (partLower.includes('abobora') || partLower.includes('abobrinha')) continue;
      if (carbNorm && partLower.includes(carbNorm.split(/[\s-]/)[0])) continue;
      if (extras.some(e => e.toLowerCase() === partLower)) continue;
      if (/m[ix]{1,2}/i.test(partLower) && /salad|legum/i.test(partLower)) continue;
      extras.push(part);
    }
    if (extras.length === 0) {
      return line === 'fit'
        ? [{ name: protein, weight: 120 }, { name: carbLabel, weight: 180 }]
        : [{ name: protein, weight: 150 }, { name: carbLabel, weight: 300 }];
    }
    // Escondidinho com extras (mix): proteína 150g, purê 200g, mix 100g (fitness)
    const proteinW = line === 'fit' ? 100 : 150;
    const extraWeight = line === 'fit' ? 50 : 100;
    const totalExtraWeight = extraWeight * extras.length;
    const carbW = (line === 'fit' ? 300 : 450) - proteinW - totalExtraWeight;
    return enforceEscondidinhoComposition(itemName, line, [
      { name: protein, weight: proteinW },
      { name: carbLabel, weight: Math.max(carbW, 0) },
      ...extras.map(e => ({ name: e, weight: extraWeight })),
    ]);
  }

  // Macarronada / pasta dishes: protein (desfiado) + macarrão with sauce, NO salad
  if (isMacarronada) {
    // Extract sauce name if present (e.g. "ao molho bechamel", "à bolonhesa")
    const sauceMatch = lower.match(/(?:ao\s+molho\s+\w+|à\s+\w+)/);
    const sauceSuffix = sauceMatch ? ` ${sauceMatch[0]}` : '';
    // For pasta dishes, protein is typically shredded
    const pastaProtein = lower.includes('frango') ? 'Frango desfiado' : protein;
    const carbName = `Macarrão${sauceSuffix}`;
    return line === 'fit'
      ? [{ name: pastaProtein, weight: 100 }, { name: carbName, weight: 200 }]
      : [{ name: pastaProtein, weight: 150 }, { name: carbName, weight: 300 }];
  }

  const carb = extractCarbName(itemName);
  return line === 'fit'
    ? [{ name: protein, weight: 100 }, { name: carb, weight: 150 }, { name: 'Mix de legumes', weight: 50 }]
    : [{ name: protein, weight: 150 }, { name: carb, weight: 200 }, { name: 'Mix de legumes', weight: 100 }];
};
