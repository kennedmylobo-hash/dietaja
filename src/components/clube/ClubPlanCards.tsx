import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Loader2 } from "lucide-react";
import { ClubPlan } from "@/hooks/useClubPlans";

interface ClubPlanCardsProps {
  plans: ClubPlan[];
  onSelect: (plan: ClubPlan) => void;
  loadingId: string | null;
}

const ClubPlanCards = ({ plans, onSelect, loadingId }: ClubPlanCardsProps) => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Escolha seu Kit Mensal
          </h2>
          <p className="text-muted-foreground">
            Todos os kits com entrega mensal automática
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const isLoading = loadingId === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    plan.popular
                      ? "border-2 border-amber-500 shadow-md dark:border-amber-400"
                      : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Popular
                    </div>
                  )}

                  <CardContent className="p-6 pt-8">
                    <div className="text-center space-y-4">
                      <div className="text-4xl">{plan.icon_emoji}</div>

                      <h3 className="font-bold text-lg text-foreground">
                        {plan.name}
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        {plan.items_description}
                      </p>

                      <div className="py-2">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-sm text-muted-foreground">R$</span>
                          <span className="text-3xl font-bold text-foreground">
                            {plan.price.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-sm text-muted-foreground">/mês</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {plan.description}
                      </p>

                      <Button
                        onClick={() => onSelect(plan)}
                        disabled={isLoading}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Carregando...
                          </>
                        ) : (
                          "Assinar agora"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ClubPlanCards;
