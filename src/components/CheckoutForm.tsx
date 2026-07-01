import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatPhone, getPhoneStatus } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Smartphone, CreditCard, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useCart } from "./CartContext";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams } from "@/lib/utm";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { toast } from "@/hooks/use-toast";
import { EmailAutocomplete } from "@/components/EmailAutocomplete";
import PixPaymentModal from "@/components/PixPaymentModal";
import { useNavigate } from "react-router-dom";
import CashbackUsage from "@/components/checkout/CashbackUsage";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTenantId } from "@/hooks/useTenantId";
import { getNextAvailableDeliveryDates, formatDateLong, isBeforeCutoff } from "@/lib/delivery-schedule";
import { fetchDeliveryZones, DeliveryZone, findZoneByNeighborhood } from "@/lib/delivery-zones";

import { validateCPF, formatCPF } from "@/lib/cpf";
import { sanitizeCustomerName } from "@/lib/name-sanitizer";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  cpf: z.string().optional(),
  paymentMethod: z.enum(["pix", "card"]).default("pix"),
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
}).superRefine((data, ctx) => {
  if (data.paymentMethod === "pix") {
    const cpfDigits = data.cpf?.replace(/\D/g, '') || '';
    if (!cpfDigits || cpfDigits.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF é obrigatório para pagamento PIX",
        path: ["cpf"],
      });
    } else if (!validateCPF(cpfDigits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF inválido. Verifique os números.",
        path: ["cpf"],
      });
    }
  }
});

type FormData = z.infer<typeof formSchema>;

interface CheckoutFormProps {
  onWhatsAppClick?: (customerData: { name: string; phone: string; deliveryOption: string; address?: string }) => void;
}

const CheckoutForm = ({ onWhatsAppClick }: CheckoutFormProps) => {
  const { items, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const tenantId = useTenantId();
  const [isLoading, setIsLoading] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  
  
  // Ref to prevent double-click submissions
  const isSubmittingRef = useRef(false);
  
  // Cashback state
  const [useCashback, setUseCashback] = useState(false);
  const [cashbackAmount, setCashbackAmount] = useState(0);
  const [watchedEmail, setWatchedEmail] = useState('');
  // Referral state
  const [referralCode, setReferralCode] = useState('');
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  // Restore pending order from sessionStorage on mount
  useEffect(() => {
    const storedOrderId = sessionStorage.getItem('pending_order_id');
    const storedInitPoint = sessionStorage.getItem('mp_init_point');
    if (storedOrderId && storedInitPoint) {
      setPendingOrderId(storedOrderId);
    }
    // Restore referral from session storage
    const saved = sessionStorage.getItem('referral_code');
    const savedDiscount = sessionStorage.getItem('referral_discount');
    if (saved) {
      setReferralCode(saved);
      setReferralDiscount(Number(savedDiscount) || 10);
      setReferralValid(true);
      setReferralApplied(true);
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
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
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");

  // Sync paymentMethod state with form value for Zod validation
  const handlePaymentMethodChange = (value: "pix" | "card") => {
    setPaymentMethod(value);
    setValue("paymentMethod", value);
  };
  
  // CPF dinâmico por método de pagamento
  useEffect(() => {
    if (paymentMethod !== "pix") {
      setValue("cpf", "");
    }
  }, [paymentMethod, setValue]);
  
  // Update watchedEmail when email changes (for cashback lookup)
  useEffect(() => {
    setWatchedEmail(emailValue);
  }, [emailValue]);

  const deliveryOption = watch("deliveryOption");
  const { location: tenantLocation, delivery: deliveryConfig } = useTenantConfig();
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [addressInput, setAddressInput] = useState("");

  const availableDates = getNextAvailableDeliveryDates(
    deliveryConfig.deliveryDays,
    deliveryConfig.cutoffDay,
    deliveryConfig.cutoffTime,
    deliveryConfig.productionDay,
    4
  );

  useEffect(() => {
    if (tenantId) {
      fetchDeliveryZones(tenantId).then(setDeliveryZones);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!scheduledDate && availableDates.length > 0) {
      setScheduledDate(availableDates[0].date);
    }
  }, [availableDates, scheduledDate]);

  const zoneFee = deliveryOption === "delivery" && selectedZone ? selectedZone.fee : 0;
  const deliveryFee = deliveryOption === "delivery"
    ? (deliveryZones.length > 0 ? zoneFee : tenantLocation.deliveryFee)
    : 0;
  const subtotal = getTotal();
  const totalBeforeCashback = subtotal + deliveryFee;
  const referralDiscountTotal = referralApplied ? totalBeforeCashback * (referralDiscount / 100) : 0;
  const total = totalBeforeCashback - cashbackAmount - referralDiscountTotal;

  const handleValidateReferral = async () => {
    if (!referralCode.trim()) { setReferralValid(false); return; }
    setValidatingReferral(true);
    const { data } = await supabase
      .from('referrals')
      .select('code, discount_percent, used_count, usage_limit, active, referrer_email')
      .eq('code', referralCode.trim())
      .eq('active', true)
      .maybeSingle();
    if (data && data.used_count < data.usage_limit && data.referrer_email !== watchedEmail) {
      setReferralDiscount(data.discount_percent);
      setReferralValid(true);
      setReferralApplied(true);
      sessionStorage.setItem('referral_code', data.code);
      sessionStorage.setItem('referral_discount', String(data.discount_percent));
    } else {
      setReferralValid(false);
      setReferralApplied(false);
    }
    setValidatingReferral(false);
  };

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
          tenant_id: tenantId,
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
    paymentId: string;
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
    
    const cpfValue = data.cpf?.replace(/\D/g, '') || '';
    
    isSubmittingRef.current = true;
    setIsLoading(true);

    trackMetaEvent({
      eventName: 'AddPaymentInfo',
      eventId: generateMetaEventId('add_payment_info'),
      tenantId,
      customerEmail: data.email,
      customerPhone: data.phone,
      params: {
        value: total,
        currency: 'BRL',
        payment_method: 'pix',
        num_items: items.length,
        content_type: 'product',
        content_name: items.map((item) => item.name).join(', '),
        content_ids: items.map((item) => item.id),
      },
    });

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
            name: sanitizeCustomerName(data.name),
            email: data.email,
            phone: data.phone,
            cpf: cpfValue,
          },
          delivery: {
            option: data.deliveryOption,
            address: data.address,
            fee: deliveryFee,
            scheduled_date: scheduledDate?.toISOString().split('T')[0],
          },
          cashback: {
            use: useCashback,
            amount: cashbackAmount,
          },
          referral_code: referralApplied ? referralCode : undefined,
          utm_data: (() => {
            const utm = getUTMParams() || {};
            // Attach A/B test data if present
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith('ab_test_')) {
                (utm as any).ab_test_id = key.replace('ab_test_', '');
                (utm as any).ab_variant = localStorage.getItem(key) || '';
                break;
              }
            }
            return utm;
          })(),
          tenant_id: tenantId,
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
          paymentId: response.payment_id,
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

  const handleCardPayment = async (data: FormData) => {
    if (isSubmittingRef.current || isLoading) return;
    
    isSubmittingRef.current = true;
    setIsLoading(true);

    trackMetaEvent({
      eventName: 'AddPaymentInfo',
      eventId: generateMetaEventId('add_payment_info'),
      tenantId,
      customerEmail: data.email,
      customerPhone: data.phone,
      params: {
        value: total,
        currency: 'BRL',
        payment_method: 'card',
        num_items: items.length,
        content_type: 'product',
        content_name: items.map((item) => item.name).join(', '),
        content_ids: items.map((item) => item.id),
      },
    });

    try {
      await createCustomerAccount(data);

      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/pagamento/sucesso`;

      const { data: response, error } = await supabase.functions.invoke('create-infinitepay-checkout', {
        body: {
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            type: item.type,
          })),
          customer: {
            name: sanitizeCustomerName(data.name),
            email: data.email,
            phone: data.phone,
          },
          delivery: {
            option: data.deliveryOption,
            address: data.address,
            fee: deliveryFee,
            scheduled_date: scheduledDate?.toISOString().split('T')[0],
          },
          referral_code: referralApplied ? referralCode : undefined,
          redirect_url: redirectUrl,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      if (response?.success && response?.checkout_url) {
        const opened = window.open(response.checkout_url, '_self');
        if (!opened) {
          window.open(response.checkout_url, '_blank');
        }
      } else {
        throw new Error(response?.error || 'Erro ao gerar link de pagamento');
      }
    } catch (error) {
      console.error('Error creating card payment:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
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
            Nome
          </Label>
          <Input
            id="name"
            placeholder="Ex.: Maria Silva"
            {...register("name")}
            className="mt-1"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            E-mail
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
          <Controller
            name="phone"
            control={control}
            render={({ field }) => {
              // Strip leading 55 if user accidentally types it
              const cleanValue = (() => {
                const d = (field.value || '').replace(/\D/g, '');
                if (d.startsWith('55') && d.length > 11) return d.slice(2);
                return d;
              })();
              const status = getPhoneStatus(cleanValue);
              return (
                <div className="space-y-1">
                  <div className="relative flex mt-1">
                    <div className="flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm font-medium select-none">
                      🇧🇷 +55
                    </div>
                    <div className="relative flex-1">
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="(77) 99100-1658"
                        value={formatPhone(cleanValue)}
                        onChange={(e) => {
                          let raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                          // Auto-strip 55 prefix if user types it
                          if (raw.startsWith('55') && raw.length > 11) raw = raw.slice(2);
                          field.onChange(raw);
                        }}
                        className={`rounded-l-none pr-10 ${status.color === 'green' ? 'border-green-500 focus-visible:ring-green-500' : status.color === 'yellow' ? 'border-yellow-500' : status.color === 'red' ? 'border-destructive' : ''}`}
                      />
                      {cleanValue.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {status.color === 'green' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {status.color === 'yellow' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                          {status.color === 'red' && <XCircle className="w-4 h-4 text-destructive" />}
                        </div>
                      )}
                    </div>
                  </div>
                  {cleanValue.length > 0 && (
                    <p className={`text-xs ${status.color === 'green' ? 'text-green-600' : status.color === 'yellow' ? 'text-yellow-600' : 'text-destructive'}`}>
                      {status.message}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
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
            if (value === "pickup") setSelectedZone(null);
          }}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-sage-light/30 border border-transparent hover:border-primary/30 transition-colors">
            <RadioGroupItem value="pickup" id="pickup" />
            <Label htmlFor="pickup" className="flex-1 cursor-pointer">
              <span className="font-medium">📍 Retirada grátis</span>
              <span className="text-sm text-muted-foreground block">{tenantLocation.pickupNeighborhood || 'Local de retirada'}</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-transparent hover:border-primary/30 transition-colors">
            <RadioGroupItem value="delivery" id="delivery" />
            <Label htmlFor="delivery" className="flex-1 cursor-pointer">
              <span className="font-medium">🛵 Entrega</span>
              <span className="text-sm text-muted-foreground ml-2">
                {deliveryZones.length > 0 && selectedZone
                  ? `+ R$ ${selectedZone.fee.toFixed(2).replace(".", ",")}`
                  : `+ R$ ${tenantLocation.deliveryFee.toFixed(2).replace(".", ",")}`}
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Delivery zone selection */}
      {deliveryOption === "delivery" && deliveryZones.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Bairro / Região</Label>
          <div className="grid grid-cols-1 gap-1.5 mt-1">
            {deliveryZones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setSelectedZone(zone)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-sm transition-all ${
                  selectedZone?.id === zone.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-primary/30 bg-muted/30"
                }`}
              >
                <div>
                  <span className="font-medium">{zone.name}</span>
                  {zone.estimated_time && (
                    <span className="text-xs text-muted-foreground ml-2">~{zone.estimated_time}</span>
                  )}
                </div>
                <span className="font-semibold">R$ {zone.fee.toFixed(2).replace(".", ",")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              register("address").onChange(e);
            }}
          />
          {errors.address && (
            <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
          )}
        </div>
      )}

      {/* Delivery date selection */}
      {hasItems && (
        <div>
          <Label className="text-sm font-medium">Agendar entrega / retirada</Label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {availableDates.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setScheduledDate(d.date)}
                className={`p-2.5 rounded-lg border text-center text-sm transition-all ${
                  scheduledDate?.toISOString().split('T')[0] === d.date.toISOString().split('T')[0]
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border hover:border-primary/30 bg-muted/30"
                }`}
              >
                <div>{d.label}</div>
              </button>
            ))}
          </div>
          {!isBeforeCutoff(deliveryConfig.cutoffDay, deliveryConfig.cutoffTime) && (
            <p className="text-xs text-destructive mt-1">
              ⏰ Pedidos após o horário de corte entram na próxima produção.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {deliveryConfig.cutoffMessage}
          </p>
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

      {/* Referral code */}
      {hasItems && (
        <div className="p-3 bg-muted/20 rounded-lg">
          <label className="text-xs text-muted-foreground mb-1 block">Código de indicação</label>
          <div className="flex gap-2">
            <input
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder="MEUCODIGO"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm uppercase font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button variant="outline" size="sm" onClick={handleValidateReferral} disabled={validatingReferral}>
              {validatingReferral ? <Loader2 className="w-3 h-3 animate-spin" /> : "Validar"}
            </Button>
          </div>
          {referralValid !== null && (
            <p className={`text-xs mt-1 ${referralValid ? "text-green-600" : "text-destructive"}`}>
              {referralValid ? `✅ ${referralDiscount}% de desconto aplicado!` : "Código inválido"}
            </p>
          )}
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
          {referralApplied && (
            <div className="flex justify-between text-sm text-purple-600">
              <span>Indicação ({referralDiscount}%)</span>
              <span>-R$ {referralDiscountTotal.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1">
            <span>Total</span>
            <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>
      )}

      {/* Payment method selection */}
      <div className="flex flex-col gap-3 pt-2">
        <Label className="text-sm font-medium">Forma de pagamento</Label>
        <RadioGroup
          value={paymentMethod || ""}
          onValueChange={(value) => handlePaymentMethodChange(value as "pix" | "card")}
          className="grid grid-cols-2 gap-3"
        >
          <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'pix' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
            <RadioGroupItem value="pix" id="payment-pix" className="sr-only" />
            <Label htmlFor="payment-pix" className="flex items-center gap-2 cursor-pointer font-medium">
              <Smartphone className="w-5 h-5" />
              PIX
            </Label>
          </div>
          <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
            <RadioGroupItem value="card" id="payment-card" className="sr-only" />
            <Label htmlFor="payment-card" className="flex items-center gap-2 cursor-pointer font-medium">
              <CreditCard className="w-5 h-5" />
              Cartão
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* CPF field - required for PIX */}
      {paymentMethod === "pix" && (
        <div>
          <Label htmlFor="cpf" className="text-sm font-medium">
            CPF <span className="text-muted-foreground">(exigido pelo PIX)</span>
          </Label>
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <Input
                id="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={formatCPF(field.value || '')}
                onChange={(e) => {
                  field.onChange(formatCPF(e.target.value));
                }}
                className={`mt-1 ${errors.cpf ? 'border-destructive' : ''}`}
              />
            )}
          />
          {errors.cpf && (
            <p className="text-xs text-destructive mt-1">{errors.cpf.message}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            Apenas para pagamento PIX, conforme exigência do Pix.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-2">
        {paymentMethod === "pix" && (
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
                Gerar PIX
              </>
            )}
          </Button>
        )}

        {paymentMethod === "card" && (
          <Button
            type="button"
            variant="cta"
            size="lg"
            className="w-full"
            onClick={handleSubmit(handleCardPayment)}
            disabled={!hasItems || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pagar com Cartão
              </>
            )}
          </Button>
        )}

        {!paymentMethod && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Selecione a forma de pagamento acima
          </p>
        )}
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
          paymentId={pixModalData.paymentId}
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
