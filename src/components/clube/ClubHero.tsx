import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

interface ClubHeroProps {
  onScrollToPlans: () => void;
}

const ClubHero = ({ onScrollToPlans }: ClubHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/80 to-background dark:from-amber-950/20">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 to-transparent dark:from-amber-900/10 opacity-50" />

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center space-y-6"
        >
          <Badge variant="outline" className="bg-amber-100/80 text-amber-800 border-amber-300/50 px-4 py-1.5 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50">
            <Crown className="w-4 h-4 mr-1.5" />
            Assinatura Mensal Exclusiva
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Clube{" "}
            <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-300">
              Dieta Já
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Receba todo mês seus kits de alimentação saudável com sabores sortidos.
            Praticidade, economia e zero preocupação.
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {["📦 Entrega mensal", "🎲 Sabores surpresa", "❌ Sem fidelidade", "💰 Preço especial"].map((item, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="bg-card border rounded-full px-4 py-2 text-foreground shadow-sm"
              >
                {item}
              </motion.span>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={onScrollToPlans}
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/25 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ver os Kits
              <ChevronDown className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ClubHero;
