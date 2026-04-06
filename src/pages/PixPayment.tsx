import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Copy, CheckCircle2, Loader2, Clock, QrCode, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { hapticFeedback } from "@/lib/haptics";
import { celebrateCheckout } from "@/lib/confetti";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";

interface PixData {
  qr_code: string;
  qr_code_base64: string;
  total: number;
  expiration: string;
  status: string;
  order_number: string;
  customer_name: string;
}

const PixPayment = () => {
  const { brand } = useTenantConfig();
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Fetch PIX data
  const fetchPixData = useCallback(async () => {
    if (!paymentId) {
      setError("ID do pagamento não encontrado");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-pix-details', {
        body: { payment_id: paymentId },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setPixData(data);
        
        // If already approved, redirect to success
        if (data.status === 'approved') {
          hapticFeedback('success');
          celebrateCheckout();
          setTimeout(() => {
            navigate(`/pagamento/sucesso?order_id=${paymentId}&status=approved`);
          }, 1500);
        }
      } else {
        setError(data?.error || "Erro ao buscar dados do pagamento");
      }
    } catch (err) {
      console.error('Error fetching PIX data:', err);
      setError("Erro ao carregar dados do pagamento");
    } finally {
      setLoading(false);
    }
  }, [paymentId, navigate]);

  // Initial fetch
  useEffect(() => {
    fetchPixData();
  }, [fetchPixData]);

  // Calculate time left
  useEffect(() => {
    if (!pixData?.expiration) return;

    const calculateTimeLeft = () => {
      const expiration = new Date(pixData.expiration).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiration - now) / 1000));
      setTimeLeft(diff);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [pixData?.expiration]);

  // Poll for payment status
  useEffect(() => {
    if (!pixData || pixData.status === 'approved') return;

    const interval = setInterval(async () => {
      setIsChecking(true);
      try {
        const { data } = await supabase.functions.invoke('check-payment-status', {
          body: { payment_id: paymentId },
        });

        if (data?.status === 'approved') {
          setPixData(prev => prev ? { ...prev, status: 'approved' } : null);
          hapticFeedback('success');
          celebrateCheckout();
          setTimeout(() => {
            navigate(`/pagamento/sucesso?order_id=${paymentId}&status=approved`);
          }, 1500);
        }
      } catch (err) {
        console.error('Error checking payment:', err);
      } finally {
        setIsChecking(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pixData, paymentId, navigate]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!pixData?.qr_code) return;

    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      hapticFeedback('success');
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco para pagar.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  const isExpired = timeLeft !== null && timeLeft === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pagamento...</p>
        </div>
      </div>
    );
  }

  if (error || !pixData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Pagamento não encontrado</h1>
          <p className="text-muted-foreground mb-6">{error || "Não foi possível carregar os dados do pagamento."}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pagar PIX - {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl shadow-xl p-6 space-y-6"
        >
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <QrCode className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Pague via PIX</h1>
            {pixData.order_number && (
              <p className="text-sm text-muted-foreground mt-1">
                Pedido #{pixData.order_number}
              </p>
            )}
          </div>

          {/* Payment approved state */}
          {pixData.status === 'approved' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8"
            >
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600">Pagamento Confirmado!</h2>
              <p className="text-muted-foreground mt-2">Redirecionando...</p>
            </motion.div>
          )}

          {/* Pending payment */}
          {pixData.status !== 'approved' && (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-inner">
                  {pixData.qr_code_base64 ? (
                    <img
                      src={`data:image/png;base64,${pixData.qr_code_base64}`}
                      alt="QR Code PIX"
                      className="w-52 h-52"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-muted rounded-lg">
                      <QrCode className="w-20 h-20 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {pixData.total.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Timer */}
              <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full mx-auto w-fit ${
                isExpired ? 'bg-destructive/10 text-destructive' : 'bg-muted'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-medium">
                  {timeLeft === null 
                    ? 'Calculando...' 
                    : isExpired 
                      ? 'PIX expirado' 
                      : `Expira em ${formatTime(timeLeft)}`
                  }
                </span>
              </div>

              {/* Copy button - MAIN CTA */}
              <Button
                onClick={handleCopy}
                disabled={isExpired}
                size="lg"
                className="w-full h-14 text-lg gap-3"
                variant={copied ? "outline" : "cta"}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    Código Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-6 h-6" />
                    Copiar Código PIX
                  </>
                )}
              </Button>

              {/* Code preview */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Código Copia e Cola:
                </p>
                <div className="bg-muted/50 p-3 rounded-lg text-xs font-mono break-all max-h-20 overflow-auto border">
                  {pixData.qr_code}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                {!isExpired && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Aguardando pagamento...</span>
                  </>
                )}
              </div>

              {/* Manual refresh */}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPixData}
                disabled={isChecking}
                className="w-full text-muted-foreground"
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Verificar pagamento
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default PixPayment;
