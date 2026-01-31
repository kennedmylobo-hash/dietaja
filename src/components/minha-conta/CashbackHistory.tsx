import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  transaction_type: 'earned' | 'used' | 'expired';
  amount: number;
  balance_after: number;
  expires_at: string | null;
  expired: boolean;
  level_slug: string | null;
  notes: string | null;
  created_at: string;
  order_id: string | null;
}

interface CashbackHistoryProps {
  transactions: Transaction[];
}

const CashbackHistory = ({ transactions }: CashbackHistoryProps) => {
  if (transactions.length === 0) {
    return null;
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'used':
        return <ArrowDown className="h-4 w-4 text-primary" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'earned':
        return 'Cashback ganho';
      case 'used':
        return 'Cashback usado';
      case 'expired':
        return 'Expirado';
      default:
        return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return 'text-green-600';
      case 'used':
        return 'text-primary';
      case 'expired':
        return 'text-muted-foreground line-through';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Cashback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {getTransactionIcon(tx.transaction_type)}
                </div>
                <div>
                  <span className="text-sm font-medium">{getTransactionLabel(tx.transaction_type)}</span>
                  <span className="text-xs text-muted-foreground block">
                    {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {tx.expires_at && tx.transaction_type === 'earned' && !tx.expired && (
                    <span className="text-xs text-amber-600">
                      Expira em {format(new Date(tx.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <span className={`font-semibold ${getTransactionColor(tx.transaction_type)}`}>
                {tx.transaction_type === 'earned' ? '+' : '-'}R$ {Math.abs(tx.amount).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CashbackHistory;
