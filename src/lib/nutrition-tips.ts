export interface NutritionTip {
  id: string;
  title: string;
  body: string;
  icon: string;
}

export const nutritionTips: NutritionTip[] = [
  {
    id: "hidratacao",
    title: "Hidratação é chave",
    body: "Beba ao menos 2L de água por dia. A água auxilia na digestão, transporte de nutrientes e regulação da temperatura corporal. Comece o dia com um copo d'água em jejum.",
    icon: "💧",
  },
  {
    id: "proteinas",
    title: "Distribua as proteínas",
    body: "Consuma proteínas magras em todas as refeições principais. Frango grelhado, peixes, ovos e tofu são ótimas opções que ajudam na saciedade e na recuperação muscular.",
    icon: "🥩",
  },
  {
    id: "cores_no_prato",
    title: "Quanto mais cor, melhor",
    body: "Um prato colorido indica variedade de nutrientes. Folhas verdes, legumes alaranjados e vegetais roxos fornecem vitaminas e antioxidantes essenciais para a saúde.",
    icon: "🥗",
  },
  {
    id: "carboidratos",
    title: "Carboidrato não é vilão",
    body: "Prefira carboidratos complexos como batata-doce, aipim, arroz integral e quinoa. Eles fornecem energia de liberação lenta, mantendo a saciedade por mais tempo.",
    icon: "🍚",
  },
  {
    id: "fracionamento",
    title: "Fracione as refeições",
    body: "Comer de 3 em 3 horas mantém o metabolismo ativo e evita picos de fome. Inclua um lanchinho entre o café da manhã e o almoço, e entre o almoço e o jantar.",
    icon: "⏰",
  },
  {
    id: "mastigacao",
    title: "Mastigue bem os alimentos",
    body: "A digestão começa na boca. Mastigar devagar e com calma melhora a absorção dos nutrientes e dá tempo para o cérebro registrar a saciedade, evitando exageros.",
    icon: "🦷",
  },
  {
    id: "sono",
    title: "Sono de qualidade",
    body: "Dormir bem regula os hormônios da fome (grehlinha e leptina). Uma noite mal dormida aumenta a vontade de comer alimentos calóricos. Priorize 7-8h de sono.",
    icon: "😴",
  },
  {
    id: "fibras",
    title: "Não esqueça das fibras",
    body: "Fibras auxiliam o funcionamento do intestino e prolongam a saciedade. Vegetais folhosos, chia, linhaça e aveia são excelentes fontes de fibra alimentar.",
    icon: "🌿",
  },
];
