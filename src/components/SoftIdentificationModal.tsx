import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, MessageCircle, ArrowRight, Lock, CheckCircle2, Loader2 } from "lucide-react";

interface SoftIdentificationModalProps {
  open: boolean;
  onConfirm: (name: string, phone: string) => void;
  onSkip?: () => void;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const SoftIdentificationModal = ({ 
  open, 
  onConfirm,
  onSkip 
}: SoftIdentificationModalProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recuperar dados do localStorage quando o modal abre
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('dietaja_customer');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.name && !name) setName(parsed.name);
          if (parsed.phone && !phone) setPhone(formatPhone(parsed.phone));
        } catch (e) {
          // Ignorar erro silenciosamente
        }
      }
      // Reset do estado de submissão quando o modal abre
      setIsSubmitting(false);
    }
  }, [open]);

  const validateAndSubmit = () => {
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = "Digite seu nome";
    }
    
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      newErrors.phone = "WhatsApp inválido";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Mostrar feedback de sucesso
    setIsSubmitting(true);
    
    // Após delay, confirmar
    setTimeout(() => {
      onConfirm(name.trim(), phoneDigits);
    }, 800);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.length <= 15) {
      setPhone(formatted);
      if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md mx-4 rounded-2xl animate-enter"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {isSubmitting ? (
              <CheckCircle2 className="w-8 h-8 text-primary animate-success-pop" />
            ) : (
              <Sparkles className="w-8 h-8 text-primary animate-sparkle-pulse" />
            )}
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {isSubmitting ? "Pronto! ✨" : "Reservando seu pedido... 🛒"}
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-base">
            {isSubmitting 
              ? "Adicionando ao seu carrinho..." 
              : "Para agilizar sua compra e garantir atendimento personalizado:"}
          </p>
        </DialogHeader>

        {!isSubmitting && (
          <>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="soft-name" className="text-base font-medium">
                  Como podemos te chamar?
                </Label>
                <Input
                  id="soft-name"
                  placeholder="Digite seu primeiro nome"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  className={`h-14 text-lg rounded-xl ${errors.name ? 'border-destructive' : ''}`}
                  autoFocus
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="soft-phone" className="text-base font-medium flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  WhatsApp para acompanhar seu pedido
                </Label>
                <Input
                  id="soft-phone"
                  placeholder="(77) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  type="tel"
                  className={`h-14 text-lg rounded-xl ${errors.phone ? 'border-destructive' : ''}`}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button 
                onClick={validateAndSubmit}
                size="lg"
                className="h-14 text-lg font-semibold rounded-xl gap-2"
              >
                Reservar meu pedido
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              {onSkip && (
                <Button 
                  variant="ghost" 
                  onClick={onSkip}
                  className="text-muted-foreground"
                >
                  Continuar sem informar
                </Button>
              )}
            </div>

            <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Lock className="w-3 h-3" />
              Dados seguros • +2.000 clientes satisfeitos
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
