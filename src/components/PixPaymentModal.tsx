import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Loader2, Clock, QrCode, X, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { hapticFeedback } from "@/lib/haptics";
import { celebrateCheckout } from "@/lib/confetti";

interface PixPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string;
  qrCodeBase64: string;
  total: number;
  paymentId: string;
  orderId: string;
  expirationDate: string;
  onPaymentSuccess: (orderNumber: string) => void;
  onPaymentFailed: () => void;
}

const PixPaymentModal = ({
  open,
  onOpenChange,
  qrCode,
  qrCodeBase64,
  total,
  paymentId,
  orderId,
  expirationDate,
  onPaymentSuccess,
  onPaymentFailed,
}: PixPaymentModalProps) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // null = not calculated yet
  const [isChecking, setIsChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Calculate time left
  useEffect(() => {
    if (!expirationDate) return;

    const calculateTimeLeft = () => {
      const expiration = new Date(expirationDate).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiration - now) / 1000));
      setTimeLeft(diff);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expirationDate]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      hapticFeedback('success');
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco para pagar.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    if (paymentStatus !== 'pending') return;
    
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { payment_id: paymentId, order_id: orderId },
      });

      if (error) throw error;

      console.log('Payment status:', data);

      if (data?.status === 'approved') {
        setPaymentStatus('approved');
        hapticFeedback('success');
        celebrateCheckout();
        onPaymentSuccess(data.order_number);
      } else if (data?.status === 'rejected') {
        setPaymentStatus('rejected');
        hapticFeedback('error');
        onPaymentFailed();
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setIsChecking(false);
    }
  }, [paymentId, orderId, paymentStatus, onPaymentSuccess, onPaymentFailed]);

  // Poll for payment status
  useEffect(() => {
    if (!open || paymentStatus !== 'pending') return;

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(checkPaymentStatus, 5000);

    // Then poll every 5 seconds
    const interval = setInterval(checkPaymentStatus, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [open, paymentStatus, checkPaymentStatus]);

  // Handle expiration - only trigger if timeLeft was calculated and reached 0
  useEffect(() => {
    if (timeLeft !== null && timeLeft === 0 && paymentStatus === 'pending') {
      onPaymentFailed();
    }
  }, [timeLeft, paymentStatus, onPaymentFailed]);

  const isExpired = timeLeft !== null && timeLeft === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Pague via PIX
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* QR Code with loading skeleton */}
          <div className="bg-white p-4 rounded-lg shadow-inner">
            {qrCodeBase64 ? (
              <img 
                src={`data:image/png;base64,${qrCodeBase64}`} 
                alt="QR Code PIX" 
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 flex flex-col items-center justify-center gap-3">
                <Skeleton className="w-full h-full rounded-lg" />
              </div>
            )}

          </div>

          {/* Total */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total a pagar</p>
            <p className="text-2xl font-bold text-primary">
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isExpired ? 'bg-destructive/10 text-destructive' : 'bg-muted'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-medium">
              {timeLeft === null ? 'Calculando...' : isExpired ? 'Expirado' : `Expira em ${formatTime(timeLeft)}`}
            </span>
          </div>

          {/* Copy code section */}
          <div className="w-full space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Ou copie o código Copia e Cola:
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted p-3 rounded-lg text-xs font-mono break-all max-h-20 overflow-auto">
                {qrCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={isExpired}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {paymentStatus === 'pending' && !isExpired && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Aguardando pagamento...</span>
              </>
            )}
            {paymentStatus === 'approved' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Pagamento confirmado!</span>
              </>
            )}
            {(paymentStatus === 'rejected' || isExpired) && (
              <>
                <X className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">
                  {isExpired ? 'PIX expirado' : 'Pagamento não aprovado'}
                </span>
              </>
            )}
          </div>

          {/* Manual refresh button */}
          {paymentStatus === 'pending' && !isExpired && (
            <Button
              variant="ghost"
              size="sm"
              onClick={checkPaymentStatus}
              disabled={isChecking}
              className="text-muted-foreground"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Verificar pagamento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;
