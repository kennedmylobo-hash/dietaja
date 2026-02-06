/**
 * Name sanitizer - blocks offensive/vulgar names in Portuguese
 * Replaces them silently with "Cliente"
 */

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a',
  '5': 's', '7': 't', '@': 'a', '!': 'i',
  '$': 's', '8': 'b',
};

// Partial terms to catch derivatives (e.g. piroquinha, putinha, etc.)
const BLOCKED_TERMS = [
  // Sexual/anatomical
  'piroc', 'pirok', 'pirog', 'pint', 'rola', 'rolud',
  'bucet', 'buset', 'buçet', 'xoxot', 'xanud',
  'penis', 'vagina', 'testic', 'escroto',
  // General profanity
  'caralh', 'karalh', 'porra', 'merda', 'bosta',
  'fode', 'foda', 'fudi', 'fuder',
  // Slurs/insults
  'viado', 'viada', 'bicha', 'puta', 'putinh',
  'corno', 'cornu', 'cacet', 'kacet',
  'arromb', 'desgraç', 'desgrac',
  'filhodaputa', 'filhadaputa', 'fdp',
  'vadia', 'vadinh', 'vagabund',
  'otari', 'idiota', 'imbecil', 'babac',
  // Racial slurs
  'negr', 'macac',
  // Others
  'punhet', 'gonorr', 'safad', 'cuzao', 'cuzão',
  'cocain', 'maconh',
];

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeName(input: string): string {
  return removeDiacritics(input)
    .toLowerCase()
    .split('')
    .map(c => LEET_MAP[c] || c)
    .join('')
    .replace(/[^a-z]/g, '');
}

function generateClienteId(): string {
  const id = Math.floor(1000 + Math.random() * 9000);
  return `Cliente #${id}`;
}

export function sanitizeCustomerName(input: string): string {
  if (!input || !input.trim()) return generateClienteId();

  const cleaned = input.trim();
  const normalized = normalizeName(cleaned);

  if (normalized.length < 2) return generateClienteId();

  for (const term of BLOCKED_TERMS) {
    if (normalized.includes(removeDiacritics(term))) {
      console.warn('[name-sanitizer] Nome bloqueado');
      return generateClienteId();
    }
  }

  // Only allow letters (including accents), spaces, hyphens, apostrophes
  if (!/^[\p{L}\s'-]+$/u.test(cleaned)) return generateClienteId();

  return cleaned;
}
