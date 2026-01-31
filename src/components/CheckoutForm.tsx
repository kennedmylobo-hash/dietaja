import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Smartphone, MessageCircle } from "lucide-react";
import { useCart } from "./CartContext";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams } from "@/lib/utm";
import { toast } from "@/hooks/use-toast";
import { EmailAutocomplete } from "@/components/EmailAutocomplete";
import PixPaymentModal from "@/components/PixPaymentModal";
import { useNavigate } from "react-router-dom";
import CashbackUsage from "@/components/checkout/CashbackUsage";

import { validateCPF, formatCPF } from "@/lib/cpf";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(18)
    .refine((val) => validateCPF(val), {
      message: "CPF inválido - verifique os dígitos",
    }),
  deliveryOption: z.enum(["pickup", "delivery"]),
  address: z.string().optional(),
  saveData: z.boolean().optional(),
}).refine((data) => {
  if (data.deliveryOption === "delivery" && (!data.address || data.address.length < 10)) {
    return false;
  }
  return true;
}, {
  message: "Endereço completo é obrigatório para entrega",
  path: ["address"],
});

type FormData = z.infer<typeof formSchema>;

interface CheckoutFormProps {
  onWhatsAppClick: (customerData: { name: string; phone: string; deliveryOption: string; address?: string }) => void;
}

const CheckoutForm = ({ onWhatsAppClick }: CheckoutFormProps) => {
  const { items, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  
  // Ref to prevent double-click submissions
  const isSubmittingRef = useRef(false);
  
  // Cashback state
  const [useCashback, setUseCashback] = useState(false);
  const [cashbackAmount, setCashbackAmount] = useState(0);
  const [watchedEmail, setWatchedEmail] = useState('');

  // Restore pending order from sessionStorage on mount
  useEffect(() => {
    const storedOrderId = sessionStorage.getItem('pending_order_id');
    const storedInitPoint = sessionStorage.getItem('mp_init_point');
    if (storedOrderId && storedInitPoint) {
      setPendingOrderId(storedOrderId);
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryOption: "pickup",
      saveData: false,
      email: "",
      cpf: "",
    },
  });

  const emailValue = watch("email");
  
  // Update watchedEmail when email changes (for cashback lookup)
  useEffect(() => {
    setWatchedEmail(emailValue);
  }, [emailValue]);

  const deliveryOption = watch("deliveryOption");
  const deliveryFee = deliveryOption === "delivery" ? 10 : 0;
  const subtotal = getTotal();
  const totalBeforeCashback = subtotal + deliveryFee;
  const total = totalBeforeCashback - cashbackAmount;

  const handleCashbackChange = useCallback((use: boolean, amount: number) => {
    setUseCashback(use);
    setCashbackAmount(amount);
  }, []);

  const createCustomerAccount = async (data: FormData) => {
    if (!saveData) return;
    
    try {
      const { data: response, error } = await supabase.functions.invoke('create-customer-account', {
        body: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          deliveryOption: data.deliveryOption,
          address: data.address,
        },
      });

      if (error) {
        console.error('Error creating account:', error);
        return;
      }

      if (response?.success) {
        toast({
          title: response.isExisting ? "Dados atualizados!" : "Conta criada!",
          description: "Enviamos um link de acesso para seu email.",
        });
      }
    } catch (error) {
      console.error('Error creating customer account:', error);
    }
  };

  const [pixModalData, setPixModalData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    orderId: string;
    total: number;
    expirationDate: string;
  } | null>(null);

  const handlePixPayment = async (data: FormData) => {
    // Prevent double-click submissions
    if (isSubmittingRef.current || isLoading) {
      console.log('Already submitting PIX payment, ignoring click');
      return;
    }
    
    isSubmittingRef.current = true;
    setIsLoading(true);

    // Track InitiateCheckout
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: total,
        currency: 'BRL',
        num_items: items.length,
      });
    }

    try {
      const { data: response, error } = await supabase.functions.invoke('create-asaas-pix', {
        body: {
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            type: item.type,
          })),
          customer: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            cpf: data.cpf.replace(/\D/g, ''),
          },
          delivery: {
            option: data.deliveryOption,
            address: data.address,
            fee: deliveryFee,
          },
          cashback: {
            use: useCashback,
            amount: cashbackAmount,
          },
          utm_data: getUTMParams(),
        },
      });

      if (error) throw error;

      if (response?.success && response?.qr_code) {
        // Store order info
        sessionStorage.setItem('pending_order_id', response.order_id);
        setPendingOrderId(response.order_id);
        
        // Show PIX modal with QR code
        setPixModalData({
          qrCode: response.qr_code,
          qrCodeBase64: response.qr_code_base64,
          orderId: response.order_id,
          total: response.total,
          expirationDate: response.expiration_date,
        });

        toast({
          title: "PIX gerado com sucesso!",
          description: "Escaneie o QR Code ou copie o código para pagar.",
        });
      } else {
        throw new Error(response?.error || 'Erro ao gerar PIX');
      }
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: error instanceof Error ? error.message : "Tente novamente ou finalize via WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleWhatsApp = async (data: FormData) => {
    // Create account if checkbox is checked
    await createCustomerAccount(data);
    
    onWhatsAppClick({
      name: data.name,
      phone: data.phone,
      deliveryOption: data.deliveryOption,
      address: data.address,
    });
  };

  const handlePixPaymentWithAccount = async (data: FormData) => {
    // Create account if checkbox is checked
    await createCustomerAccount(data);
    
    // Then proceed with payment
    await handlePixPayment(data);
  };

  const hasItems = items.length > 0;

  return (
    <form className="space-y-4">
      {/* Customer data */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Nome completo
          </Label>
          <Input
            id="name"
            placeholder="Seu nome"
            {...register("name")}
            className="mt-1"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <EmailAutocomplete
                id="email"
                value={field.value}
                onChange={field.onChange}
                className="mt-1"
                error={!!errors.email}
              />
            )}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            WhatsApp
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(77) 99100-1658"
            {...register("phone")}
            className="mt-1"
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="cpf" className="text-sm font-medium">
            CPF
          </Label>
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            {...register("cpf", {
              onChange: (e) => {
                e.target.value = formatCPF(e.target.value);
              }
            })}
            className="mt-1"
          />
          {errors.cpf && (
            <p className="text-xs text-destructive mt-1">{errors.cpf.message}</p>
          )}
        </div>
      </div>

      {/* Delivery option */}
      <div className="pt-2">
        <Label className="text-sm font-medium">Entrega ou retirada</Label>
        <RadioGroup
          defaultValue="pickup"
          onValueChange={(value) => {
            const event = { target: { name: "deliveryOption", value } };
            register("deliveryOption").onChange(event as React.ChangeEvent<HTMLInputElement>);
          }}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-sage-light/30 border border-transparent hover:border-primary/30 transition-colors">
            <RadioGroupItem value="pickup" id="pickup" />
            <Label htmlFor="pickup" className="flex-1 cursor-pointer">
              <span className="font-medium">📍 Retirada grátis</span>
              <span className="text-sm text-muted-foreground block">Bairro Recreio</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-transparent hover:border-primary/30 transition-colors">
            <RadioGroupItem value="delivery" id="delivery" />
            <Label htmlFor="delivery" className="flex-1 cursor-pointer">
              <span className="font-medium">🛵 Entrega</span>
              <span className="text-sm text-muted-foreground ml-2">+ R$ 10,00</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Address (conditional) */}
      {deliveryOption === "delivery" && (
        <div>
          <Label htmlFor="address" className="text-sm font-medium">
            Endereço completo
          </Label>
          <Input
            id="address"
            placeholder="Rua, número, bairro"
            {...register("address")}
            className="mt-1"
          />
          {errors.address && (
            <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
          )}
        </div>
      )}

      {/* Save data checkbox */}
      {hasItems && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Checkbox
            id="saveData"
            checked={saveData}
            onCheckedChange={(checked) => setSaveData(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="saveData" className="text-sm cursor-pointer leading-relaxed">
            <span className="font-medium">Salvar meus dados para próximas compras</span>
            <span className="text-muted-foreground block text-xs mt-0.5">
              Criaremos uma conta e enviaremos um link de acesso para seu email
            </span>
          </Label>
        </div>
      )}

      {/* Cashback usage */}
      {hasItems && watchedEmail && (
        <CashbackUsage
          customerEmail={watchedEmail}
          orderTotal={totalBeforeCashback}
          onCashbackChange={handleCashbackChange}
        />
      )}

      {/* Totals */}
      {hasItems && (
        <div className="pt-3 border-t border-border space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entrega</span>
              <span>R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          {cashbackAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Cashback aplicado</span>
              <span>-R$ {cashbackAmount.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1">
            <span>Total</span>
            <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="button"
          variant="cta"
          size="lg"
          className="w-full"
          onClick={handleSubmit(handlePixPaymentWithAccount)}
          disabled={!hasItems || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Smartphone className="w-5 h-5" />
              Pagar via PIX
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleSubmit(handleWhatsApp)}
          disabled={!hasItems || isLoading}
        >
          <MessageCircle className="w-5 h-5" />
          Finalizar via WhatsApp
        </Button>
      </div>

      {/* PIX Payment Modal */}
      {pixModalData && (
        <PixPaymentModal
          open={!!pixModalData}
          onOpenChange={(open) => {
            if (!open) setPixModalData(null);
          }}
          qrCode={pixModalData.qrCode}
          qrCodeBase64={pixModalData.qrCodeBase64}
          total={pixModalData.total}
          paymentId={pixModalData.orderId}
          orderId={pixModalData.orderId}
          expirationDate={pixModalData.expirationDate}
          onPaymentSuccess={(orderNumber) => {
            setPixModalData(null);
            clearCart();
            navigate(`/pagamento/sucesso?order_id=${pixModalData.orderId}&order_number=${orderNumber}`);
          }}
          onPaymentFailed={() => {
            setPixModalData(null);
            toast({
              title: "Pagamento não concluído",
              description: "O PIX expirou ou foi cancelado. Tente novamente.",
              variant: "destructive",
            });
          }}
        />
      )}
    </form>
  );
};

export default CheckoutForm;
