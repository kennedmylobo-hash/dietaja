export interface ParsedIngredient {
  name: string;
  weightGrams: number;
}

export interface ParsedDietItem {
  number: number;
  description: string;
  ingredients: ParsedIngredient[];
  totalWeight: number;
}

/**
 * Parses a WhatsApp message with numbered diet items and extracts
 * item descriptions and individual ingredient weights.
 */
export function parseDietMessage(text: string): ParsedDietItem[] {
  if (!text.trim()) return [];

  const items: ParsedDietItem[] = [];

  // Split by numbered items: "1-", "1)", "1.", "1 -", etc.
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  let currentItem: { num: number; text: string } | null = null;

  for (const line of lines) {
    const numberMatch = line.match(/^(\d+)\s*[-.)]\s*(.*)/);
    if (numberMatch) {
      if (currentItem) {
        items.push(parseItem(currentItem.num, currentItem.text));
      }
      currentItem = { num: parseInt(numberMatch[1]), text: numberMatch[2] };
    } else if (currentItem) {
      currentItem.text += ' ' + line;
    }
  }

  if (currentItem) {
    items.push(parseItem(currentItem.num, currentItem.text));
  }

  return items;
}

function parseItem(num: number, text: string): ParsedDietItem {
  const ingredients: ParsedIngredient[] = [];

  // Match patterns like "arroz com brócolis (100g)" or "tilápia (80g)"
  const regex = /([^(+\n]+?)\s*\((\d+)\s*g?\)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const name = match[1]
      .replace(/^\s*[+,]\s*/, '')
      .replace(/\s*com\s*$/, '')
      .replace(/^\s*com\s+/, '')
      .trim();

    if (name) {
      ingredients.push({
        name,
        weightGrams: parseInt(match[2]),
      });
    }
  }

  // If no weights found, treat entire text as single item with 0g
  if (ingredients.length === 0) {
    ingredients.push({
      name: text.trim(),
      weightGrams: 0,
    });
  }

  const totalWeight = ingredients.reduce((sum, i) => sum + i.weightGrams, 0);

  // Build clean description
  const description = ingredients
    .map(i => i.name)
    .join(' + ');

  return {
    number: num,
    description,
    ingredients,
    totalWeight,
  };
}
