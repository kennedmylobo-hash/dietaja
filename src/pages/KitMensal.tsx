import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Package, Utensils, CreditCard, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPhone, getPhoneStatus } from "@/lib/phone";
import { validateCPF, formatCPF } from "@/lib/cpf";
import { sanitizeCustomerName } from "@/lib/name-sanitizer";
import { EmailAutocomplete } from "@/components/EmailAutocomplete";
import PixPaymentModal from "@/components/PixPaymentModal";
import { useNavigate } from "react-router-dom";
import { useTenantId } from "@/hooks/useTenantId";
import { Helmet } from "react-helmet-async";

const KIT_PRICE = 499;
const KIT_TOTAL_MEALS = 20;

const KIT_FLAVORS = [
  { qty: 3, name: "Macarrão integral à bolonhesa" },
  { qty: 3, name: "Almôndegas de carne ao molho sugo natural com espaguete integral" },
  { qty: 3, name: "Estrogonofe de carne com arroz e mix de salada" },
  { qty: 3, name: "Estrogonofe de frango com arroz e mix de salada" },
  { qty: 4, name: "Escondidinho de carne com purê de aipim" },
  { qty: 4, name: "Frango em cubos ao molho de maracujá com purê de batata doce e mix de legumes" },
];

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  cpf: z.string().min(1, "CPF é obrigatório"),
  paymentMethod: z.enum(["pix", "credit_card"]),
  address: z.string().min(10, "Endereço completo é obrigatório"),
}).superRefine((data, ctx) => {
  const cpfDigits = data.cpf?.replace(/\D/g, '') || '';
  if (!cpfDigits || cpfDigits.length !== 11) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF deve ter 11 dígitos", path: ["cpf"] });
  } else if (!validateCPF(cpfDigits)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF inválido.", path: ["cpf"] });
  }
});

type FormData = z.infer<typeof formSchema>;

const KitMensal = () => {
  const navigate = useNavigate();
  const tenantId = useTenantId();
  const [isLoading, setIsLoading] = useState(false);
  const [pixModalData, setPixModalData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    orderId: string;
    paymentId: string;
    total: number;
    expirationDate: string;
  } | null>(null);

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
      paymentMethod: "pix",
      cpf: "",
      address: "",
    },
  });

  const paymentMethod = watch("paymentMethod");
  const total = KIT_PRICE;

  const onSubmit = async (data: FormData) => {
    if (isLoading) return;
    setIsLoading(true);

    const cpfDigits = data.cpf.replace(/\D/g, '');

    try {
      if (data.paymentMethod === "pix") {
        const { data: response, error } = await supabase.functions.invoke('create-asaas-pix', {
          body: {
            items: [{
              name: `Kit Mensal Emagrecimento - ${KIT_TOTAL_MEALS} marmitas Fit`,
              quantity: 1,
              unitPrice: KIT_PRICE,
              totalPrice: KIT_PRICE,
              type: "kit-mensal",
            }],
            customer: {
              name: sanitizeCustomerName(data.name),
              email: data.email,
              phone: data.phone,
              cpf: cpfDigits,
            },
            delivery: {
              option: 'delivery',
              address: data.address,
              fee: 0,
            },
            tenant_id: tenantId,
          },
        });

        if (error) throw error;

        if (response?.success && response?.qr_code) {
          setPixModalData({
            qrCode: response.qr_code,
            qrCodeBase64: response.qr_code_base64,
            orderId: response.order_id,
            paymentId: response.payment_id,
            total: response.total,
            expirationDate: response.expiration_date,
          });
          toast({ title: "PIX gerado!", description: "Escaneie o QR Code ou copie o código para pagar." });
        } else {
          throw new Error(response?.error || 'Erro ao gerar PIX');
        }
      } else {
        // Credit card via Asaas
        const { data: response, error } = await supabase.functions.invoke('create-asaas-credit', {
          body: {
            item_name: `Kit Mensal Emagrecimento - ${KIT_TOTAL_MEALS} marmitas Fit`,
            amount: total,
            customer: {
              name: sanitizeCustomerName(data.name),
              email: data.email,
              phone: data.phone,
              cpf: cpfDigits,
            },
            delivery: {
              option: 'delivery',
              address: data.address,
              fee: 0,
            },
            tenant_id: tenantId,
          },
        });

        if (error) throw error;

        if (response?.success && response?.payment_link) {
          window.location.href = response.payment_link;
        } else {
          throw new Error(response?.error || 'Erro ao gerar link de pagamento');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Kit Mensal Emagrecimento - 20 Marmitas Fit | Dieta Já</title>
        <meta name="description" content="Kit mensal com 20 marmitas fit para emagrecimento. Sabores variados, almoço de segunda a sexta. Por apenas R$499." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary/15 via-background to-secondary/30 py-12 md:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
              <Package className="w-4 h-4" />
              Oferta Exclusiva
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Kit Mensal <span className="text-primary">Emagrecimento</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {KIT_TOTAL_MEALS} marmitas Fit com sabores variados para o mês inteiro. 
              Uma refeição por dia, de segunda a sexta.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-4xl md:text-5xl font-bold text-primary">
                R$ {KIT_PRICE},00
              </span>
              <span className="text-muted-foreground text-sm">
                apenas<br />R$ {(KIT_PRICE / KIT_TOTAL_MEALS).toFixed(2).replace('.', ',')} / marmita
              </span>
            </div>
            <Button
              size="lg"
              className="mt-4 text-lg px-8 py-6 rounded-full shadow-lg"
              onClick={() => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Reservar Agora
            </Button>
          </div>
        </section>

        {/* Flavors */}
        <section className="py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
              <Utensils className="w-6 h-6 inline-block mr-2 text-primary" />
              Cardápio do Kit
            </h2>
            <p className="text-center text-muted-foreground mb-8">
              {KIT_TOTAL_MEALS} marmitas com sabores selecionados
            </p>

            <div className="grid gap-3">
              {KIT_FLAVORS.map((flavor, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {flavor.qty}x
                  </div>
                  <span className="text-foreground font-medium">{flavor.name}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-secondary text-center">
              <p className="text-sm text-muted-foreground">
                ✅ Todas as marmitas são da linha <strong>Fit</strong> — balanceadas para emagrecimento
              </p>
            </div>
          </div>
        </section>

        {/* Checkout */}
        <section id="checkout" className="py-12 px-4 bg-card/50">
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-6">
              Reserve o seu Kit
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                <Input id="name" placeholder="Seu nome" {...register("name")} className="mt-1" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <EmailAutocomplete id="email" value={field.value} onChange={field.onChange} className="mt-1" error={!!errors.email} />
                  )}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">WhatsApp</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => {
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
                      </div>
                    );
                  }}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>

              {/* CPF */}
              <div>
                <Label htmlFor="cpf" className="text-sm font-medium">CPF</Label>
                <Controller
                  name="cpf"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="cpf"
                      type="tel"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={formatCPF(field.value || '')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                        field.onChange(raw);
                      }}
                      className="mt-1"
                    />
                  )}
                />
                {errors.cpf && <p className="text-xs text-destructive mt-1">{errors.cpf.message}</p>}
              </div>

              {/* Delivery */}
              <div className="pt-2">
                <Label className="text-sm font-medium">Entrega ou retirada</Label>
                <RadioGroup
                  defaultValue="pickup"
                  onValueChange={(value) => setValue("deliveryOption", value as "pickup" | "delivery")}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/30 border border-transparent hover:border-primary/30 transition-colors">
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

              {deliveryOption === "delivery" && (
                <div>
                  <Label htmlFor="address" className="text-sm font-medium">Endereço completo</Label>
                  <Input id="address" placeholder="Rua, número, bairro" {...register("address")} className="mt-1" />
                  {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
                </div>
              )}

              {/* Payment method */}
              <div className="pt-2">
                <Label className="text-sm font-medium">Forma de pagamento</Label>
                <RadioGroup
                  defaultValue="pix"
                  onValueChange={(value) => setValue("paymentMethod", value as "pix" | "credit_card")}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/30 border border-transparent hover:border-primary/30 transition-colors">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="flex-1 cursor-pointer flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-primary" />
                      <span className="font-medium">PIX</span>
                      <span className="text-xs text-muted-foreground">— Aprovação imediata</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-transparent hover:border-primary/30 transition-colors">
                    <RadioGroupItem value="credit_card" id="credit_card" />
                    <Label htmlFor="credit_card" className="flex-1 cursor-pointer flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="font-medium">Cartão de Crédito</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Total */}
              <div className="pt-3 border-t border-border space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kit Mensal ({KIT_TOTAL_MEALS} marmitas)</span>
                  <span>R$ {KIT_PRICE},00</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entrega</span>
                    <span>R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>Total</span>
                  <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-lg py-6 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processando...</>
                ) : (
                  paymentMethod === "pix" ? "Pagar via PIX" : "Pagar com Cartão"
                )}
              </Button>
            </form>
          </div>
        </section>
      </div>

      {/* PIX Modal */}
      {pixModalData && (
        <PixPaymentModal
          open={!!pixModalData}
          onOpenChange={(open) => { if (!open) setPixModalData(null); }}
          qrCode={pixModalData.qrCode}
          qrCodeBase64={pixModalData.qrCodeBase64}
          total={pixModalData.total}
          paymentId={pixModalData.paymentId}
          orderId={pixModalData.orderId}
          expirationDate={pixModalData.expirationDate}
          onPaymentSuccess={(orderNumber) => {
            setPixModalData(null);
            navigate(`/pagamento/sucesso?order=${orderNumber}`);
          }}
          onPaymentFailed={() => {
            setPixModalData(null);
            toast({ title: "Pagamento não confirmado", description: "Tente novamente.", variant: "destructive" });
          }}
        />
      )}
    </>
  );
};

export default KitMensal;
