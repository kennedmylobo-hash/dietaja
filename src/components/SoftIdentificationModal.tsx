import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, User, Phone } from "lucide-react";

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
    
    onConfirm(name.trim(), phoneDigits);
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
        className="sm:max-w-md mx-4 rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Ótima escolha! 🎉
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-base">
            Para separar seu pedido, informe seus dados:
          </p>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="soft-name" className="text-base font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Seu nome
            </Label>
            <Input
              id="soft-name"
              placeholder="Ex: Maria"
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
              <Phone className="w-4 h-4" />
              Seu WhatsApp
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
            className="h-14 text-lg font-semibold rounded-xl"
          >
            ✓ Continuar
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

        <p className="text-xs text-center text-muted-foreground mt-2">
          Seus dados são protegidos e usados apenas para seu pedido
        </p>
      </DialogContent>
    </Dialog>
  );
};
