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

function findBestMatch(text: string, catalog: CatalogItem[]): { item: CatalogItem; confidence: number } | null {
  let bestMatch: CatalogItem | null = null;
  let bestScore = 0;

  const normalizedText = text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  for (const item of catalog) {
    const normalizedName = item.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Check for exact or substring match first
    if (normalizedText.includes(normalizedName) || normalizedName.includes(normalizedText)) {
      const score = normalizedText === normalizedName ? 1 : 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    } else {
      // Use fuzzy matching
      const score = similarity(normalizedText, normalizedName);
      if (score > 0.75 && score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // Check individual words
    const words = normalizedText.split(/\s+/);
    const itemWords = normalizedName.split(/\s+/);
    
    for (const word of words) {
      if (word.length < 3) continue;
      for (const itemWord of itemWords) {
        if (itemWord.length < 3) continue;
        const wordScore = similarity(word, itemWord);
        if (wordScore > 0.8 && wordScore * 0.85 > bestScore) {
          bestScore = wordScore * 0.85;
          bestMatch = item;
        }
      }
    }
  }

  return bestMatch ? { item: bestMatch, confidence: bestScore } : null;
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
