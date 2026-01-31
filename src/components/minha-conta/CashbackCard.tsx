import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { CashbackData } from '@/hooks/useCashback';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashbackCardProps {
  cashbackData: CashbackData;
}

const CashbackCard = ({ cashbackData }: CashbackCardProps) => {
  const {
    balance,
    currentLevel,
    nextLevel,
    progressToNextLevel,
    availableCashback,
    expiringCashback,
    loading,
  } = cashbackData;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-amber-500/10 pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="pt-4">
          <Skeleton className="h-12 w-32 mb-4" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const daysUntilExpiration = expiringCashback
    ? differenceInDays(new Date(expiringCashback.expiresAt), new Date())
    : null;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      {/* Header with level badge */}
      <CardHeader className="bg-gradient-to-r from-primary/10 to-amber-500/10 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Meu Cashback
            </CardTitle>
            <CardDescription className="mt-1">
              Ganhe de volta em cada pedido
            </CardDescription>
          </div>
          
          {/* Level badge */}
          {currentLevel && (
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border shadow-sm">
              <span className="text-xl">{currentLevel.emoji}</span>
              <div className="text-right">
                <span className="font-semibold text-sm">{currentLevel.name}</span>
                <span className="text-xs text-primary block">{currentLevel.cashback_percent}% de volta</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Current balance */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Saldo disponível</span>
            <p className="text-3xl font-bold text-primary">
              R$ {availableCashback.toFixed(2).replace('.', ',')}
            </p>
          </div>
          
          {availableCashback > 0 && (
            <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Use no próximo pedido
            </div>
          )}
        </div>

        {/* Expiration warning */}
        {expiringCashback && daysUntilExpiration !== null && daysUntilExpiration <= 10 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">
              <strong>R$ {expiringCashback.amount.toFixed(2).replace('.', ',')}</strong> expira em{' '}
              {daysUntilExpiration === 0 ? 'hoje' : `${daysUntilExpiration} dias`}
              {' '}({format(new Date(expiringCashback.expiresAt), "dd/MM", { locale: ptBR })})
            </span>
          </div>
        )}

        {/* Progress to next level */}
        {nextLevel && progressToNextLevel && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Próximo nível: {nextLevel.emoji} {nextLevel.name}
              </span>
              <span className="text-xs text-primary font-semibold">
                {nextLevel.cashback_percent}% de volta
              </span>
            </div>
            
            <div className="space-y-2">
              {/* Orders progress */}
              {nextLevel.min_orders > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Pedidos</span>
                    <span>
                      {balance?.total_orders || 0}/{nextLevel.min_orders}
                      {progressToNextLevel.ordersNeeded > 0 && (
                        <span className="text-primary ml-1">
                          (faltam {progressToNextLevel.ordersNeeded})
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress value={progressToNextLevel.ordersProgress} className="h-2" />
                </div>
              )}
              
              {/* Spent progress */}
              {nextLevel.min_spent > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Valor gasto</span>
                    <span>
                      R$ {(balance?.total_spent || 0).toFixed(0)}/R$ {nextLevel.min_spent.toFixed(0)}
                      {progressToNextLevel.spentNeeded > 0 && (
                        <span className="text-primary ml-1">
                          (faltam R$ {progressToNextLevel.spentNeeded.toFixed(0)})
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress value={progressToNextLevel.spentProgress} className="h-2" />
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              ✨ Basta atingir <strong>um</strong> dos critérios para subir de nível
            </p>
          </div>
        )}

        {/* Stats summary */}
        {balance && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <span className="text-lg font-bold text-foreground">{balance.total_orders}</span>
              <span className="text-xs text-muted-foreground block">Pedidos</span>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <span className="text-lg font-bold text-green-600">
                R$ {balance.total_earned.toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground block">Ganho</span>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <span className="text-lg font-bold text-primary">
                R$ {balance.total_used.toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground block">Usado</span>
            </div>
          </div>
        )}

        {/* No balance yet */}
        {!balance && (
          <div className="text-center py-4">
            <Gift className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Faça seu primeiro pedido e comece a acumular cashback!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CashbackCard;
