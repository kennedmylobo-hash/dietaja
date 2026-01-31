import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Gift, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CashbackUsageProps {
  customerEmail: string;
  orderTotal: number;
  onCashbackChange: (useCashback: boolean, cashbackAmount: number) => void;
}

const CashbackUsage = ({ customerEmail, orderTotal, onCashbackChange }: CashbackUsageProps) => {
  const [availableCashback, setAvailableCashback] = useState(0);
  const [useCashback, setUseCashback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerEmail) {
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        const { data, error } = await supabase
          .from('cashback_balances')
          .select('current_balance')
          .eq('customer_email', customerEmail)
          .single();

        if (!error && data) {
          setAvailableCashback(Number(data.current_balance) || 0);
        }
      } catch (err) {
        console.error('Error fetching cashback balance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [customerEmail]);

  useEffect(() => {
    // Calculate applicable cashback (can't exceed order total)
    const applicableAmount = useCashback ? Math.min(availableCashback, orderTotal) : 0;
    onCashbackChange(useCashback, applicableAmount);
  }, [useCashback, availableCashback, orderTotal, onCashbackChange]);

  if (loading || availableCashback <= 0) {
    return null;
  }

  const applicableAmount = Math.min(availableCashback, orderTotal);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-amber-500/5 border border-primary/20">
      <Checkbox
        id="useCashback"
        checked={useCashback}
        onCheckedChange={(checked) => setUseCashback(checked === true)}
        className="mt-0.5"
      />
      <Label htmlFor="useCashback" className="flex-1 cursor-pointer">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Usar meu cashback</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            -R$ {applicableAmount.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <span className="text-xs text-muted-foreground block mt-0.5">
          Você tem R$ {availableCashback.toFixed(2).replace('.', ',')} disponíveis
          {availableCashback > orderTotal && (
            <span className="text-amber-600 ml-1">
              (limitado ao valor do pedido)
            </span>
          )}
        </span>
      </Label>
    </div>
  );
};

export default CashbackUsage;
