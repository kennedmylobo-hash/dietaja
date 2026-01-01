export type QuizObjective = 'emagrecer' | 'praticidade' | 'energia' | 'nao-sei';
export type QuizAvailability = 'poucos-dias' | 'uma-semana' | 'maximo';
export type QuizMealsPerWeek = 7 | 14 | 28;

export interface QuizAnswers {
  objective: QuizObjective;
  availability?: QuizAvailability;
  mealsPerWeek?: QuizMealsPerWeek;
  name?: string;
  phone?: string;
}

export interface ProductRecommendation {
  type: 'kit' | 'marmita';
  id: string;
  name: string;
  price: number;
  description: string;
  days?: number;
  quantity?: number;
  unitPrice?: number;
}

export interface CrossSellItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  highlight?: string;
  badge?: string;
}

export interface Recommendation {
  primary: ProductRecommendation;
  crossSell?: {
    headline: string;
    description: string;
    items: CrossSellItem[];
  };
  isPersonalized: boolean;
}

// Kit data
const kits = {
  '3-dias': {
    type: 'kit' as const,
    id: '3-dias',
    name: 'Kit Detox 3 Dias',
    price: 199,
    days: 3,
    description: 'Ideal para desinchar e retomar o controle rapidamente.',
  },
  '5-dias': {
    type: 'kit' as const,
    id: '5-dias',
    name: 'Kit Detox 5 Dias',
    price: 299,
    days: 5,
    description: 'O equilíbrio perfeito entre resultado e praticidade. Mais vendido!',
  },
  '7-dias': {
    type: 'kit' as const,
    id: '7-dias',
    name: 'Kit Detox 7 Dias',
    price: 399,
    days: 7,
    description: 'Para quem busca uma transformação mais profunda e consistente.',
  },
};

// Marmita packages
const marmitas = {
  7: {
    type: 'marmita' as const,
    id: 'marmita-7',
    name: 'Pacote Semanal',
    quantity: 7,
    unitPrice: 25.90,
    price: 181.30,
    description: 'Praticidade para a sua semana inteira.',
  },
  14: {
    type: 'marmita' as const,
    id: 'marmita-14',
    name: 'Pacote Quinzenal',
    quantity: 14,
    unitPrice: 23.90,
    price: 334.60,
    description: 'Economia de R$ 2 por marmita. Ideal para manutenção!',
  },
  28: {
    type: 'marmita' as const,
    id: 'marmita-28',
    name: 'Pacote Mensal',
    quantity: 28,
    unitPrice: 19.90,
    price: 557.20,
    description: 'Maior economia! Economize R$ 6 por marmita.',
  },
};

// Cross-sell items for maintenance after detox
const crossSellItems: CrossSellItem[] = [
  {
    id: 'marmita-14',
    name: '14 Marmitas',
    quantity: 14,
    unitPrice: 23.90,
    totalPrice: 334.60,
    highlight: 'Ideal para manutenção',
    badge: 'Recomendado',
  },
  {
    id: 'marmita-28',
    name: '28 Marmitas',
    quantity: 28,
    unitPrice: 19.90,
    totalPrice: 557.20,
    highlight: 'Maior economia!',
    badge: 'Economize R$ 4/un',
  },
];

export function getRecommendation(answers: QuizAnswers): Recommendation {
  const { objective, availability, mealsPerWeek } = answers;

  // Personalized diet path
  if (objective === 'nao-sei') {
    return {
      primary: {
        type: 'kit',
        id: 'personalized',
        name: 'Dieta Personalizada',
        price: 0,
        description: 'Vamos montar um plano sob medida para você, considerando suas necessidades específicas.',
      },
      isPersonalized: true,
    };
  }

  // Practicality path - marmitas
  if (objective === 'praticidade' && mealsPerWeek) {
    return {
      primary: marmitas[mealsPerWeek],
      isPersonalized: false,
    };
  }

  // Detox/Energy path - kits with cross-sell
  let selectedKit = kits['5-dias']; // default

  if (availability === 'poucos-dias') {
    selectedKit = kits['3-dias'];
  } else if (availability === 'uma-semana') {
    selectedKit = kits['5-dias'];
  } else if (availability === 'maximo') {
    selectedKit = kits['7-dias'];
  }

  return {
    primary: selectedKit,
    crossSell: {
      headline: 'Para manter o resultado:',
      description: 'Após o detox, continue com alimentação saudável e prática!',
      items: crossSellItems,
    },
    isPersonalized: false,
  };
}

export function formatQuizDataForWhatsApp(
  answers: QuizAnswers,
  recommendation: Recommendation,
  utmSummary?: string
): string {
  const objectiveLabels: Record<QuizObjective, string> = {
    'emagrecer': 'Emagrecer / Desinchar',
    'praticidade': 'Praticidade no dia a dia',
    'energia': 'Mais energia e disposição',
    'nao-sei': 'Preciso de ajuda personalizada',
  };

  let message = `Olá! Fiz o quiz no site e recebi uma recomendação:\n\n`;
  message += `🎯 *Objetivo:* ${objectiveLabels[answers.objective]}\n`;
  
  if (answers.availability) {
    const availabilityLabels: Record<QuizAvailability, string> = {
      'poucos-dias': 'Poucos dias (quero testar)',
      'uma-semana': '1 semana (resultado consistente)',
      'maximo': 'Resultado máximo',
    };
    message += `⏰ *Disponibilidade:* ${availabilityLabels[answers.availability]}\n`;
  }
  
  if (answers.mealsPerWeek) {
    message += `🍽️ *Refeições por semana:* ${answers.mealsPerWeek}\n`;
  }

  message += `\n✅ *Produto recomendado:* ${recommendation.primary.name}\n`;

  if (answers.name) {
    message += `\n👤 *Nome:* ${answers.name}`;
  }
  if (answers.phone) {
    message += `\n📱 *WhatsApp:* ${answers.phone}`;
  }

  if (utmSummary) {
    message += `\n\n${utmSummary}`;
  }

  message += `\n\nPode me ajudar a finalizar?`;

  return message;
}

// localStorage key for quiz data
const QUIZ_STORAGE_KEY = 'dietaja_quiz_data';

export interface QuizStorageEntry {
  answers: QuizAnswers;
  recommendation: string;
  timestamp: string;
  converted?: boolean;
}

export function saveQuizToStorage(answers: QuizAnswers, recommendation: Recommendation): void {
  try {
    const entry: QuizStorageEntry = {
      answers,
      recommendation: recommendation.primary.name,
      timestamp: new Date().toISOString(),
      converted: false,
    };

    // Get existing data
    const existing = getQuizHistory();
    
    // Add new entry (keep last 10)
    const updated = [entry, ...existing].slice(0, 10);
    
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // Silently fail if localStorage is not available
    console.warn('Could not save quiz data to localStorage');
  }
}

export function markQuizAsConverted(): void {
  try {
    const existing = getQuizHistory();
    if (existing.length > 0) {
      existing[0].converted = true;
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (e) {
    // Silently fail
  }
}

export function getQuizHistory(): QuizStorageEntry[] {
  try {
    const data = localStorage.getItem(QUIZ_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function getLastQuizEntry(): QuizStorageEntry | null {
  const history = getQuizHistory();
  return history.length > 0 ? history[0] : null;
}
