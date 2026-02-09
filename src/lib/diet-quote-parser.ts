export interface ParsedIngredient {
  name: string;
  weightGrams: number;
  category: "protein" | "carb" | "veggie";
}

export interface ParsedDietItem {
  number: number;
  description: string;
  ingredients: ParsedIngredient[];
  totalWeight: number;
  proteinWeight: number;
  carbWeight: number;
  veggieWeight: number;
}

// Keywords to classify ingredients
const PROTEIN_KEYWORDS = [
  "frango", "carne", "bovina", "bovino", "peixe", "tilápia", "tilapia", "salmão", "salmon",
  "camarão", "camarao", "ovo", "ovos", "atum", "hambúrguer", "hamburguer", "hamburger",
  "strogonoff", "estrogonofe", "filé", "file", "linguiça", "linguica", "costela",
  "porco", "suíno", "suino", "picanha", "alcatra", "patinho", "acém", "acem",
  "grão de bico", "grao de bico", "lentilha", "tofu", "proteína", "proteina",
  "empanado", "grelhado", "desfiado", "moída", "moida", "cubos",
];

const CARB_KEYWORDS = [
  "arroz", "macarrão", "macarrao", "massa", "batata", "mandioca", "aipim",
  "purê", "pure", "nhoque", "lasanha", "espaguete", "penne", "fusilli",
  "feijão", "feijao", "farofa", "cuscuz", "tapioca", "pão", "pao",
  "polenta", "milho", "inhame", "cará", "cara", "escondidinho",
];

const VEGGIE_KEYWORDS = [
  "legume", "legumes", "variado", "variados", "salada", "brócolis", "brocolis",
  "cenoura", "abobrinha", "abóbora", "abobora", "vagem", "espinafre",
  "couve", "acelga", "berinjela", "tomate", "pepino", "alface", "rúcula", "rucula",
  "beterraba", "chuchu", "quiabo", "mix", "lascas",
];

function classifyIngredient(name: string): "protein" | "carb" | "veggie" {
  const lower = name.toLowerCase();

  for (const kw of PROTEIN_KEYWORDS) {
    if (lower.includes(kw)) return "protein";
  }
  for (const kw of CARB_KEYWORDS) {
    if (lower.includes(kw)) return "carb";
  }
  for (const kw of VEGGIE_KEYWORDS) {
    if (lower.includes(kw)) return "veggie";
  }

  // Default: if has weight and no match, treat as carb (most common filler)
  return "carb";
}

/**
 * Parses a WhatsApp message with numbered diet items and extracts
 * item descriptions and individual ingredient weights + categories.
 */
export function parseDietMessage(text: string): ParsedDietItem[] {
  if (!text.trim()) return [];

  const items: ParsedDietItem[] = [];
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
        category: classifyIngredient(name),
      });
    }
  }

  if (ingredients.length === 0) {
    ingredients.push({
      name: text.trim(),
      weightGrams: 0,
      category: "protein",
    });
  }

  const totalWeight = ingredients.reduce((sum, i) => sum + i.weightGrams, 0);
  const proteinWeight = ingredients.filter(i => i.category === "protein").reduce((s, i) => s + i.weightGrams, 0);
  const carbWeight = ingredients.filter(i => i.category === "carb").reduce((s, i) => s + i.weightGrams, 0);
  const veggieWeight = ingredients.filter(i => i.category === "veggie").reduce((s, i) => s + i.weightGrams, 0);

  const description = ingredients.map(i => i.name).join(' + ');

  return {
    number: num,
    description,
    ingredients,
    totalWeight,
    proteinWeight,
    carbWeight,
    veggieWeight,
  };
}
