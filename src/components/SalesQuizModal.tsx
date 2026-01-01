import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Leaf, 
  Clock, 
  Zap, 
  HelpCircle,
  ShoppingCart,
  MessageCircle,
  Check,
  Loader2,
  Droplets,
  Moon,
  Heart,
  Scale,
  CheckCircle2
} from "lucide-react";
import { useCart } from "./CartContext";
import { toast } from "@/hooks/use-toast";
import { getUTMSummary } from "@/lib/utm";
import { 
  getRecommendation, 
  formatQuizDataForWhatsApp,
  saveQuizToStorage,
  markQuizAsConverted,
  type QuizAnswers, 
  type QuizObjective, 
  type QuizAvailability, 
  type QuizMealsPerWeek,
  type Recommendation,
  type CrossSellItem
} from "@/lib/quiz-logic";

const WHATSAPP_NUMBER = "5577991001658";

interface SalesQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'objective' | 'specification' | 'lead' | 'analyzing' | 'result';

const objectiveOptions: { value: QuizObjective; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'emagrecer', label: 'Emagrecer / Desinchar', icon: <Leaf className="w-5 h-5" />, description: 'Quero perder peso e me sentir mais leve' },
  { value: 'praticidade', label: 'Praticidade no dia a dia', icon: <Clock className="w-5 h-5" />, description: 'Não tenho tempo de cozinhar' },
  { value: 'energia', label: 'Mais energia e disposição', icon: <Zap className="w-5 h-5" />, description: 'Quero me sentir com mais vitalidade' },
  { value: 'nao-sei', label: 'Não sei, quero ajuda', icon: <HelpCircle className="w-5 h-5" />, description: 'Preciso de orientação personalizada' },
];

const availabilityOptions: { value: QuizAvailability; label: string; description: string }[] = [
  { value: 'poucos-dias', label: 'Poucos dias', description: 'Quero testar e ver como me sinto' },
  { value: 'uma-semana', label: '1 semana', description: 'Tempo ideal para resultado consistente' },
  { value: 'maximo', label: 'Resultado máximo', description: 'Quero uma transformação mais profunda' },
];

const mealsOptions: { value: QuizMealsPerWeek; label: string; description: string }[] = [
  { value: 7, label: '7 refeições', description: 'Uma semana de praticidade' },
  { value: 14, label: '14 refeições', description: 'Quinzenal - melhor custo-benefício' },
  { value: 28, label: '28 refeições', description: 'Mensal - maior economia!' },
];
const detoxBenefits = [
  { icon: Sparkles, text: "Desintoxicação completa do organismo" },
  { icon: Leaf, text: "Limpeza intestinal profunda" },
  { icon: Droplets, text: "Redução do inchaço e retenção de líquidos" },
  { icon: Zap, text: "Mais energia e disposição no dia a dia" },
  { icon: Moon, text: "Melhora na qualidade do sono" },
  { icon: Heart, text: "Pele mais bonita e saudável" },
  { icon: Scale, text: "Eliminação de toxinas acumuladas" },
];

const SalesQuizModal = ({ open, onOpenChange }: SalesQuizModalProps) => {
  const [step, setStep] = useState<Step>('objective');
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [primaryAdded, setPrimaryAdded] = useState(false);
  const { addItem, items } = useCart();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('objective');
      setAnswers({});
      setRecommendation(null);
      setPrimaryAdded(false);
    }
  }, [open]);

  const handleObjectiveSelect = (objective: QuizObjective) => {
    setAnswers({ ...answers, objective });
    
    if (objective === 'nao-sei') {
      // Skip to analyzing and then result
      setStep('analyzing');
      setTimeout(() => {
        const rec = getRecommendation({ objective } as QuizAnswers);
        setRecommendation(rec);
        saveQuizToStorage({ objective } as QuizAnswers, rec);
        setStep('result');
      }, 1500);
    } else {
      setStep('specification');
    }
  };

  const handleSpecificationSelect = (value: QuizAvailability | QuizMealsPerWeek) => {
    const updatedAnswers = { ...answers };
    
    if (answers.objective === 'praticidade') {
      updatedAnswers.mealsPerWeek = value as QuizMealsPerWeek;
    } else {
      updatedAnswers.availability = value as QuizAvailability;
    }
    
    setAnswers(updatedAnswers);
    setStep('lead');
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    proceedToResult();
  };

  const handleSkipLead = () => {
    proceedToResult();
  };

  const proceedToResult = () => {
    setStep('analyzing');
    
    // Track Lead event if we have contact info
    if (answers.name || answers.phone) {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Lead', {
          content_name: 'Quiz Consultor',
          lead_type: 'quiz'
        });
      }
    }

    setTimeout(() => {
      const rec = getRecommendation(answers as QuizAnswers);
      setRecommendation(rec);
      
      // Save to localStorage for analytics/remarketing
      saveQuizToStorage(answers as QuizAnswers, rec);
      
      // Track ViewContent
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_name: rec.primary.name,
          content_type: 'product',
          value: rec.primary.price,
          currency: 'BRL'
        });
      }
      
      setStep('result');
    }, 1500);
  };

  const handleAddToCart = (item: { type: 'kit' | 'marmita'; name: string; price: number; description: string; quantity?: number }) => {
    addItem({
      type: item.type,
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: item.type === 'marmita' && item.quantity ? item.price / item.quantity : item.price,
      totalPrice: item.price,
      description: item.description,
    });

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: item.name,
    });
  };

  const handleAddCrossSell = (item: CrossSellItem) => {
    addItem({
      type: 'marmita',
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      description: `${item.quantity} marmitas congeladas`,
    });

    toast({
      title: "Adicionado ao carrinho! 🛒",
      description: item.name,
    });
  };

  const handleWhatsAppClick = () => {
    if (!recommendation) return;
    
    // Mark as converted
    markQuizAsConverted();
    
    const utmSummary = getUTMSummary();
    const message = formatQuizDataForWhatsApp(answers as QuizAnswers, recommendation, utmSummary);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
    onOpenChange(false);
  };

  const goBack = () => {
    if (step === 'specification') {
      setStep('objective');
    } else if (step === 'lead') {
      setStep('specification');
    }
  };

  const getProgress = () => {
    switch (step) {
      case 'objective': return 25;
      case 'specification': return 50;
      case 'lead': return 75;
      case 'analyzing': return 90;
      case 'result': return 100;
      default: return 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Quiz: Descubra o kit ideal para você</DialogTitle>
        
        {/* Progress bar */}
        <div className="w-full h-1 bg-muted">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress()}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Objective */}
            {step === 'objective' && (
              <motion.div
                key="objective"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-3">
                    <Sparkles className="w-4 h-4" />
                    Quiz Consultor
                  </span>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Qual é o seu principal objetivo?
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Escolha a opção que mais combina com você
                  </p>
                </div>

                <div className="space-y-3">
                  {objectiveOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleObjectiveSelect(option.value)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Specification */}
            {step === 'specification' && (
              <motion.div
                key="specification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {answers.objective === 'praticidade' 
                      ? 'Quantas refeições você precisa por semana?'
                      : 'Quanto tempo você tem disponível para o detox?'
                    }
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {answers.objective === 'praticidade'
                      ? 'Quanto maior o pacote, maior a economia!'
                      : 'Escolha de acordo com sua disponibilidade'
                    }
                  </p>
                </div>

                <div className="space-y-3">
                  {(answers.objective === 'praticidade' ? mealsOptions : availabilityOptions).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSpecificationSelect(option.value)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div>
                        <p className="font-medium text-foreground">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Lead Capture */}
            {step === 'lead' && (
              <motion.div
                key="lead"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Quase lá! 🎉
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Opcional: deixe seu contato para receber dicas exclusivas
                  </p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Seu nome"
                      value={answers.name || ''}
                      onChange={(e) => setAnswers({ ...answers, name: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="WhatsApp (opcional)"
                      type="tel"
                      value={answers.phone || ''}
                      onChange={(e) => setAnswers({ ...answers, phone: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button type="submit" variant="cta" className="w-full">
                      Ver minha recomendação
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <button
                      type="button"
                      onClick={handleSkipLead}
                      className="text-muted-foreground hover:text-foreground text-sm py-2"
                    >
                      Pular esta etapa
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Analyzing */}
            {step === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Analisando suas respostas...
                </h2>
                <p className="text-muted-foreground text-sm">
                  Preparando sua recomendação personalizada
                </p>
              </motion.div>
            )}

            {/* Step 4: Result */}
            {step === 'result' && recommendation && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-3">
                    <Check className="w-4 h-4" />
                    Recomendação pronta!
                  </span>
                  <h2 className="text-xl font-bold text-foreground">
                    {recommendation.isPersonalized 
                      ? 'Você precisa de atenção especial!'
                      : 'Perfeito para você:'
                    }
                  </h2>
                </div>

                {/* Detox Benefits - only show for kit recommendations */}
                {recommendation.primary.type === 'kit' && (
                  <div className="bg-primary/5 rounded-xl p-4 mb-5 border border-primary/10">
                    <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-primary" />
                      Por que o Detox é ideal para você:
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {detoxBenefits.map((benefit, index) => {
                        const Icon = benefit.icon;
                        return (
                          <motion.div
                            key={benefit.text}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-muted-foreground">{benefit.text}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary recommendation */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/20 mb-4">
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {recommendation.primary.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {recommendation.primary.description}
                  </p>

                  {!recommendation.isPersonalized && recommendation.primary.price > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-primary">
                        R$ {recommendation.primary.price.toFixed(2).replace('.', ',')}
                      </span>
                      {recommendation.primary.type === 'marmita' && recommendation.primary.unitPrice && (
                        <span className="text-sm text-muted-foreground">
                          R$ {recommendation.primary.unitPrice.toFixed(2).replace('.', ',')}/un
                        </span>
                      )}
                    </div>
                  )}

                  {recommendation.isPersonalized ? (
                    <Button 
                      variant="cta" 
                      className="w-full"
                      onClick={handleWhatsAppClick}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Falar com especialista
                    </Button>
                  ) : primaryAdded ? (
                    <Button 
                      variant="outline" 
                      className="w-full bg-primary/10 border-primary/30 text-primary cursor-default"
                      disabled
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Adicionado ao carrinho!
                    </Button>
                  ) : (
                    <Button 
                      variant="cta" 
                      className="w-full"
                      onClick={() => {
                        handleAddToCart({
                          type: recommendation.primary.type,
                          name: recommendation.primary.name,
                          price: recommendation.primary.price,
                          description: recommendation.primary.description,
                          quantity: recommendation.primary.quantity,
                        });
                        setPrimaryAdded(true);
                      }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Adicionar ao carrinho
                    </Button>
                  )}
                </div>

                {/* Post-add-to-cart actions */}
                {primaryAdded && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 mb-4"
                  >
                    <Button
                      variant="cta"
                      className="w-full"
                      onClick={() => {
                        markQuizAsConverted();
                        const utmSummary = getUTMSummary();
                        
                        // Format cart items for WhatsApp
                        const itemsList = items.map(item => 
                          `• ${item.quantity}x ${item.name} - R$ ${item.totalPrice.toFixed(2).replace('.', ',')}`
                        ).join('\n');
                        const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
                        
                        let message = `Olá! Gostaria de finalizar meu pedido:\n\n${itemsList}\n\n💰 *Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
                        if (utmSummary) {
                          message += `\n\n${utmSummary}`;
                        }
                        
                        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
                        onOpenChange(false);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Finalizar pedido via WhatsApp
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => onOpenChange(false)}
                    >
                      Continuar comprando
                    </Button>
                  </motion.div>
                )}

                {/* Cross-sell */}
                {recommendation.crossSell && (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <h4 className="font-bold text-foreground">
                        {recommendation.crossSell.headline}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.crossSell.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {recommendation.crossSell.items.map((item) => (
                        <div
                          key={item.id}
                          className="relative bg-card rounded-xl p-4 border border-border hover:border-primary/30 transition-colors"
                        >
                          {item.badge && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-terracotta text-white text-xs font-medium rounded-full whitespace-nowrap">
                              {item.badge}
                            </span>
                          )}
                          <p className="font-bold text-foreground text-center mb-1">
                            {item.name}
                          </p>
                          <p className="text-primary font-bold text-center mb-1">
                            R$ {item.unitPrice.toFixed(2).replace('.', ',')}/un
                          </p>
                          <p className="text-xs text-muted-foreground text-center mb-3">
                            {item.highlight}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleAddCrossSell(item)}
                          >
                            Adicionar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final CTA */}
                {!recommendation.isPersonalized && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      className="w-full text-primary hover:text-primary"
                      onClick={handleWhatsAppClick}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Prefiro falar no WhatsApp
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesQuizModal;
