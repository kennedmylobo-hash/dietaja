import { Droplets, Salad, Dumbbell, ChevronRight } from "lucide-react";
import { hapticFeedback } from "@/lib/haptics";

const cards = [
  {
    id: "marmitas-fit",
    icon: Salad,
    emoji: "🔥",
    title: "Kit Emagrecimento",
    subtitle: "O mais vendido!",
    description: "5 marmitas balanceadas para sua semana",
    gradient: "from-[hsl(90,30%,45%)] to-[hsl(90,35%,55%)]",
  },
  {
    id: "marmitas-fitness",
    icon: Dumbbell,
    emoji: "💪",
    title: "Kit Ganho de Massa",
    subtitle: "Para quem treina!",
    description: "Refeições hiperproteicas e calóricas",
    gradient: "from-[hsl(25,35%,55%)] to-[hsl(25,40%,65%)]",
  },
  {
    id: "kits",
    icon: Droplets,
    emoji: "🧃",
    title: "Kit Detox",
    subtitle: "Renove seu corpo!",
    description: "Sucos e sopas detox para 3 ou 5 dias",
    gradient: "from-[hsl(130,25%,40%)] to-[hsl(130,30%,50%)]",
  },
];

const MobileNavCards = () => {
  const scrollTo = (id: string) => {
    hapticFeedback("light");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="md:hidden px-4 py-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-foreground">
          O que você deseja? 🤔
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha uma opção abaixo 👇
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => scrollTo(card.id)}
              className={`relative flex flex-col items-start p-3 rounded-2xl bg-gradient-to-br ${card.gradient} text-white text-left active:scale-[0.96] transition-transform shadow-md min-h-[160px]`}
            >
              {/* Icon watermark */}
              <div className="absolute top-2 right-2 opacity-30">
                <Icon className="w-8 h-8" />
              </div>

              {/* Content */}
              <span className="text-lg mb-1">{card.emoji}</span>
              <p className="font-bold text-[13px] leading-tight">{card.title}</p>
              <p className="text-[10px] font-medium opacity-90 mt-0.5">{card.subtitle}</p>
              <p className="text-[9px] opacity-75 mt-1 leading-tight flex-1">{card.description}</p>

              {/* CTA */}
              <div className="flex items-center gap-0.5 mt-2 text-[10px] font-semibold bg-white/20 rounded-full px-2 py-0.5">
                Clique
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default MobileNavCards;
