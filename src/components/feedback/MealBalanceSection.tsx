import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Package, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MealCredit {
  id: string;
  quantity: number;
  remaining: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface MealWithdrawal {
  id: string;
  quantity: number;
  withdrawn_at: string;
  notes: string | null;
  credit_id: string;
}

interface Props {
  customerId: string;
}

const MealBalanceSection = ({ customerId }: Props) => {
  const [credits, setCredits] = useState<MealCredit[]>([]);
  const [withdrawals, setWithdrawals] = useState<MealWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [creditsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from("customer_meal_credits")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("customer_meal_withdrawals")
          .select("*")
          .eq("customer_id", customerId)
          .order("withdrawn_at", { ascending: false })
          .limit(20),
      ]);

      setCredits((creditsRes.data as MealCredit[]) || []);
      setWithdrawals((withdrawalsRes.data as MealWithdrawal[]) || []);
      setLoading(false);
    };
    fetch();
  }, [customerId]);

  if (loading) return null;

  const activeCredits = credits.filter(
    (c) => c.remaining > 0 && (!c.expires_at || new Date(c.expires_at) >= new Date())
  );
  const totalRemaining = activeCredits.reduce((sum, c) => sum + c.remaining, 0);
  const totalOriginal = activeCredits.reduce((sum, c) => sum + c.quantity, 0);

  if (credits.length === 0) return null;

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff > 0;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Saldo de Marmitas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total balance */}
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{totalRemaining}</p>
          <p className="text-sm text-muted-foreground">marmitas restantes</p>
          {totalOriginal > 0 && (
            <Progress
              value={(totalRemaining / totalOriginal) * 100}
              className="mt-3 h-2"
            />
          )}
        </div>

        {/* Active batches */}
        {activeCredits.map((credit) => (
          <div
            key={credit.id}
            className="border border-border rounded-lg p-3 text-sm space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {credit.remaining}/{credit.quantity} restantes
              </span>
              {credit.expires_at && (
                <span
                  className={`text-xs flex items-center gap-1 ${
                    isExpiringSoon(credit.expires_at)
                      ? "text-orange-600 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {isExpiringSoon(credit.expires_at) && (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  <Calendar className="h-3 w-3" />
                  Vence {format(new Date(credit.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
            <Progress
              value={(credit.remaining / credit.quantity) * 100}
              className="h-1.5"
            />
            {credit.notes && (
              <p className="text-xs text-muted-foreground">{credit.notes}</p>
            )}
          </div>
        ))}

        {/* Warning if balance is low */}
        {totalRemaining > 0 && totalRemaining <= 5 && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Seu saldo está baixo! Fale conosco para renovar.
          </div>
        )}

        {totalRemaining === 0 && credits.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Saldo zerado. Entre em contato para fazer uma nova compra!
          </div>
        )}

        {/* Recent withdrawals */}
        {withdrawals.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Últimas retiradas
            </p>
            <div className="space-y-1">
              {withdrawals.slice(0, 5).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span>
                    -{w.quantity} marmita{w.quantity > 1 ? "s" : ""}
                    {w.notes && ` • ${w.notes}`}
                  </span>
                  <span>
                    {format(new Date(w.withdrawn_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MealBalanceSection;
