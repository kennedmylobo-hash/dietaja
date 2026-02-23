// WhatsApp conversation parser for order extraction

export interface ParsedOrderItem {
  name: string;
  matchedName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'marmita' | 'juice' | 'soup' | 'kit' | 'unknown';
  confidence: number;
}

export interface ParsedCustomer {
  name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
}

export interface ParsedOrder {
  customer: ParsedCustomer;
  items: ParsedOrderItem[];
  subtotal: number;
  rawText: string;
  warnings: string[];
}

interface CatalogItem {
  name: string;
  type: 'marmita' | 'juice' | 'soup' | 'kit';
  price?: number;
  category?: string;
}

// Fuzzy string matching using Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function similarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLen);
}

// Side-dish keywords that differentiate similar flavors
const SIDE_KEYWORDS = ['aipim', 'arroz', 'batata doce', 'batata-doce', 'feijao', 'feijão', 'graos', 'grãos', 'pure', 'purê', 'mandioca', 'macaxeira'];

// Protein keywords — mismatches here must heavily penalize the score
const PROTEIN_KEYWORDS = [
  'carne', 'frango', 'peixe', 'bovina', 'suina', 'suína', 'porco',
  'almondega', 'almondegas', 'almôndega', 'almôndegas',
  'estrogonofe', 'strogonoff',
  'desfiado', 'desfiada', 'cubos', 'grelhado', 'grelhada', 'moida', 'moído',
];

function normalizeFull(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Extracts the core protein identifier from a dish name.
 * E.g. "Estrogonofe de carne, aipim e mix de legumes" → "estrogonofe carne"
 * E.g. "Frango em cubos, aipim e mix de salada" → "frango cubos"
 */
function extractProteinSignature(normalizedName: string): string {
  // Remove side-dish parts after comma or "com"
  const core = normalizedName.split(/[,]|\s+com\s+/)[0].trim();
  // Remove prepositions
  return core.replace(/\b(de|em|ao|a|o|da|do|das|dos|na|no|nas|nos)\b/g, '').replace(/\s+/g, ' ').trim();
}

function findBestMatch(text: string, catalog: CatalogItem[]): { item: CatalogItem; confidence: number } | null {
  let bestMatch: CatalogItem | null = null;
  let bestScore = 0;

  const normalizedText = normalizeFull(text).replace(/mix de salada/g, 'mix de legumes');
  const userProteinSig = extractProteinSignature(normalizedText);

  // Detect side-dish keywords in user text
  const userKeywords = SIDE_KEYWORDS.filter(k => normalizedText.includes(normalizeFull(k)));

  for (const item of catalog) {
    const normalizedName = normalizeFull(item.name).replace(/mix de salada/g, 'mix de legumes');

    let score = 0;

    // Check for exact or substring match first
    if (normalizedText.includes(normalizedName) || normalizedName.includes(normalizedText)) {
      score = normalizedText === normalizedName ? 1 : 0.9;
    } else {
      // Use fuzzy matching
      score = similarity(normalizedText, normalizedName);
      if (score <= 0.75) continue;
    }

    // === PROTEIN MISMATCH PENALTY ===
    // Compare the core protein part (before sides) to avoid matching
    // "Estrogonofe de carne" to "Estrogonofe de frango"
    const candidateProteinSig = extractProteinSignature(normalizedName);
    if (userProteinSig !== candidateProteinSig) {
      const userProteins = PROTEIN_KEYWORDS.filter(k => userProteinSig.includes(k));
      const candidateProteins = PROTEIN_KEYWORDS.filter(k => candidateProteinSig.includes(k));
      
      if (userProteins.length > 0 && candidateProteins.length > 0) {
        const candidateSet = new Set(candidateProteins);
        // Only penalize when user has a protein the candidate LACKS
        // e.g. user says "carne" but candidate is "frango" → conflict
        // but user says "carne" and candidate is "carne bovina" → no conflict (subset)
        const userHasExtra = userProteins.some(p => !candidateSet.has(p));
        if (userHasExtra) {
          score *= 0.2; // Very heavy penalty for protein mismatch
        }
      }
    }

    // Penalize if user has a side-dish keyword that candidate doesn't have (or vice-versa)
    if (userKeywords.length > 0) {
      const candidateKeywords = SIDE_KEYWORDS.filter(k => normalizedName.includes(normalizeFull(k)));
      if (candidateKeywords.length > 0) {
        const userHas = userKeywords.some(k => !candidateKeywords.map(c => normalizeFull(c)).includes(normalizeFull(k)));
        if (userHas) {
          score *= 0.4; // Heavy penalty only when there's a real conflict
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch && bestScore >= 0.75 ? { item: bestMatch, confidence: bestScore } : null;
}

// Extract phone number from text
function extractPhone(text: string): string | null {
  // Brazilian phone patterns
  const patterns = [
    /(?:whatsapp|zap|tel(?:efone)?|celular|fone|contato)?[:\s]*(?:\+?55\s?)?(?:\(?0?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/gi,
    /(?:\+?55\s?)?\(?(?:0?\d{2})\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean the number
      const cleaned = match[0].replace(/\D/g, '');
      // Remove country code if present
      const phone = cleaned.startsWith('55') ? cleaned.slice(2) : cleaned;
      // Return if it looks like a valid phone
      if (phone.length >= 10 && phone.length <= 11) {
        return phone;
      }
    }
  }

  return null;
}

// Extract customer name from text
function extractName(text: string): string | null {
  const patterns = [
    /(?:nome|cliente|para|destinat[aá]rio)[:\s]+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i,
    /(?:^|\n)([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)(?:\s*[-–—]|\s+(?:aqui|pedido|quero))/m,
    /(?:sou|meu nome [eé])[:\s]+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out common words that aren't names
      const blacklist = ['olá', 'oi', 'bom', 'boa', 'dia', 'tarde', 'noite', 'quero', 'gostaria', 'preciso'];
      if (!blacklist.includes(name.toLowerCase()) && name.length > 2) {
        return name;
      }
    }
  }

  return null;
}

// Extract address from text
function extractAddress(text: string): string | null {
  const patterns = [
    /(?:endere[çc]o|entrega|entregar|enviar|delivery|entrega em|enviar para|endereco)[:\s]+([^\n]+)/i,
    /(?:rua|av(?:enida)?|alameda|travessa|pra[çc]a|largo)[.\s]+[^\n]+,?\s*(?:n[º°]?\s*)?\d+[^\n]*/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const address = (match[1] || match[0]).trim();
      if (address.length > 10) {
        return address;
      }
    }
  }

  return null;
}

// Extract order items with quantities
function extractItems(text: string, catalog: CatalogItem[]): ParsedOrderItem[] {
  const items: ParsedOrderItem[] = [];
  const lines = text.split(/\n/);

  // Patterns to find quantity + product
  const quantityPatterns = [
    /(\d+)\s*(?:x|un(?:idades?)?|marmitas?|sucos?|sopas?|kits?)?\s*(?:de\s+)?(.+)/i,
    /(.+?)\s*(?:x|[-–])\s*(\d+)/i,
    /(.+?)\s*(?:\(|\[)?(\d+)\s*(?:un(?:idades?)?|x)(?:\)|\])?/i,
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 3) continue;

    let quantity = 1;
    let productText = trimmedLine;

    // Try to extract quantity
    for (const pattern of quantityPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        // Check which group is the number
        if (/^\d+$/.test(match[1])) {
          quantity = parseInt(match[1], 10);
          productText = match[2];
        } else if (/^\d+$/.test(match[2])) {
          quantity = parseInt(match[2], 10);
          productText = match[1];
        }
        break;
      }
    }

    // Filter noise: only accept lines captured by a quantity pattern with enough text
    if (productText.trim().length < 8) continue;

    // Try to match with catalog
    const matchResult = findBestMatch(productText, catalog);
    if (matchResult && matchResult.confidence >= 0.75) {
      const { item, confidence } = matchResult;
      items.push({
        name: productText.trim(),
        matchedName: item.name,
        quantity,
        unitPrice: item.price || 0,
        totalPrice: (item.price || 0) * quantity,
        type: item.type,
        confidence,
      });
    } else {
      // No match: accept as-is so no items are lost
      items.push({
        name: productText.trim(),
        matchedName: productText.trim(),
        quantity,
        unitPrice: 0,
        totalPrice: 0,
        type: 'marmita',
        confidence: 0,
      });
    }
  }

  return items;
}

export function parseWhatsAppConversation(
  text: string,
  catalog: CatalogItem[]
): ParsedOrder {
  const warnings: string[] = [];

  // Extract customer info
  const phone = extractPhone(text);
  const name = extractName(text);
  const address = extractAddress(text);

  if (!phone) {
    warnings.push('Telefone não encontrado na conversa');
  }
  if (!name) {
    warnings.push('Nome do cliente não identificado');
  }
  if (!address) {
    warnings.push('Endereço de entrega não encontrado');
  }

  // Extract items
  const items = extractItems(text, catalog);

  if (items.length === 0) {
    warnings.push('Nenhum item do cardápio identificado');
  }

  // Check for low confidence matches
  const lowConfidence = items.filter(i => i.confidence < 0.8);
  if (lowConfidence.length > 0) {
    warnings.push(`${lowConfidence.length} item(s) com baixa confiança de identificação`);
  }

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    customer: {
      name,
      phone,
      address,
      email: null,
    },
    items,
    subtotal,
    rawText: text,
    warnings,
  };
}

export interface ParsedCustomDietItem {
  quantity: number;
  description: string; // full line e.g. "120G Proteína de Soja ao Sugo com 150G Arroz e 30G Brócolis"
}

/**
 * Parse custom/personalised diet lines with explicit weights.
 * Format: "2x 120G Proteína de Soja ao Sugo com 150G Arroz e 30G Brócolis"
 * or     "2 120G Proteína de Soja ao Sugo com 150G Arroz e 30G Brócolis"
 */
export function parseCustomDietLines(text: string): ParsedCustomDietItem[] {
  const items: ParsedCustomDietItem[] = [];
  const lines = text.split(/\n/);

  // Pattern: optional quantity (digits + optional "x"), then at least one "NNNg ingredient"
  const linePattern = /^(\d+)\s*x?\s+(.+)/i;
  const weightPattern = /\d+\s*g\s/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;

    const match = trimmed.match(linePattern);
    if (!match) continue;

    const quantity = parseInt(match[1], 10);
    const description = match[2].trim();

    // Only accept lines that contain at least one weight pattern (e.g. "120G")
    if (!weightPattern.test(description + ' ')) continue;

    items.push({ quantity, description });
  }

  return items;
}

export function buildCatalog(
  marmitaFlavors: { name: string; category: string }[],
): CatalogItem[] {
  const catalog: CatalogItem[] = [];

  // Only add marmita flavors — packages, kits, juices and soups
  // are NOT included to avoid false matches
  for (const flavor of marmitaFlavors) {
    catalog.push({
      name: flavor.name,
      type: 'marmita',
      category: flavor.category,
    });
  }

  return catalog;
}
