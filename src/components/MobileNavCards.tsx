import { Droplets, Salad, Dumbbell } from "lucide-react";
import { hapticFeedback } from "@/lib/haptics";

const cards = [
  {
    id: "kits",
    icon: Droplets,
    emoji: "🥤",
    title: "Kit Detox",
    description: "Sucos e sopas funcionais para desintoxicar",
  },
  {
    id: "marmitas-fit",
    icon: Salad,
    emoji: "🥗",
    title: "Kit de Marmitas Emagrecimento",
    description: "Marmitas fit 300g para perder peso",
  },
  {
    id: "marmitas-fitness",
    icon: Dumbbell,
    emoji: "💪",
    title: "Kit de Marmitas Hipertrofia",
    description: "Marmitas fitness 450g para ganho de massa",
  },
];

const MobileNavCards = () => {
  const scrollTo = (id: string) => {
    hapticFeedback("light");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="md:hidden px-4 py-4 space-y-3">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => scrollTo(card.id)}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 shadow-sm text-left active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl">{card.emoji}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground">{card.title}</p>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </div>
        </button>
      ))}
    </section>
  );
};

export default MobileNavCards;
