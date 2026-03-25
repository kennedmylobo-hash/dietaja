import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2, XCircle, CreditCard, QrCode, Clock, Flame, ShieldCheck, Star, Truck, Zap, ChefHat, Snowflake, ThumbsUp, AlertTriangle } from "lucide-react";
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

import kitImg1 from "@/assets/kit-mensal-1.png";
import kitImg2 from "@/assets/kit-mensal-2.png";
import kitImg3 from "@/assets/kit-mensal-3.png";
import kitImg4 from "@/assets/kit-mensal-4.png";

const KIT_IMAGES = [kitImg1, kitImg2, kitImg3, kitImg4];

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

const BENEFITS = [
  { icon: Clock, text: "Sem tempo pra cozinhar? Pronto em 3 minutos." },
  { icon: Flame, text: "Refeições balanceadas feitas pra você emagrecer." },
  { icon: Snowflake, text: "Congeladas: duram até 3 meses no freezer." },
  { icon: ChefHat, text: "6 sabores diferentes — você não enjoa nunca." },
  { icon: Truck, text: "Entrega grátis na sua porta." },
  { icon: Zap, text: "Chega de iFood caro e comida que engorda." },
];

const STEPS = [
  { step: "1", title: "Escolha", desc: "Peça seu kit com 20 marmitas" },
  { step: "2", title: "Receba", desc: "Entrega grátis na sua casa" },
  { step: "3", title: "Congele", desc: "Dura até 3 meses no freezer" },
  { step: "4", title: "Aqueça", desc: "Pronto em 3 min no micro-ondas" },
];

const FAQ_ITEMS = [
  { q: "É gostoso mesmo?", a: "Sim! São receitas caseiras com tempero natural. Nossos clientes dizem que nem parece comida de dieta." },
  { q: "Vou enjoar de comer sempre a mesma coisa?", a: "Não! São 6 sabores diferentes que se revezam durante a semana. Variedade é garantida." },
  { q: "A porção é grande o suficiente?", a: "Sim! Nossas marmitas têm em média 350-400g, uma refeição completa com proteína, carboidrato e salada." },
  { q: "Funciona pra emagrecer?", a: "Sim! Todas são da linha Fit, balanceadas nutricionalmente. Combinadas com bons hábitos, os resultados aparecem já nas primeiras semanas." },
  { q: "Preciso cozinhar alguma coisa?", a: "Nada! É só tirar do freezer, aquecer no micro-ondas por 3 minutos e comer. Zero preparo." },
  { q: "Como funciona a entrega?", a: "Entregamos na sua casa, grátis. As marmitas chegam congeladas e prontas para armazenar no freezer." },
];

const TESTIMONIALS = [
  { name: "Carla M.", text: "Perdi 4kg no primeiro mês sem sofrer. A comida é gostosa demais e eu não preciso pensar em nada.", stars: 5 },
  { name: "Rafael S.", text: "Por ser congelada, fiquei com minhas dúvidas. Mas quando provei, vi que é tudo fresquinho e bem temperado. Salvou meu dia a dia, não fico sem!", stars: 5 },
  { name: "Juliana P.", text: "Meu almoço tá resolvido de segunda a sexta. Aquece em 3 minutos e pronto. Vida mudou!", stars: 5 },
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

const scrollToCheckout = () => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' });

const KitMensal = () => {
  const navigate = useNavigate();
  const tenantId = useTenantId();
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
        <meta name="description" content="Emagreça sem cozinhar. 20 marmitas fit congeladas entregues na sua porta por R$24,95 cada. Entrega grátis." />
      </Helmet>

      <div className="min-h-screen bg-background">

        {/* ===== HERO ===== */}
        <section className="bg-gradient-to-b from-primary/15 to-background px-4 pt-8 pb-6">
          <div className="max-w-lg mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Vagas limitadas — produção semanal
            </div>

            <h1 className="text-2xl font-extrabold text-foreground leading-tight">
              Emagreça sem cozinhar.<br />
              <span className="text-primary">20 marmitas fit na sua porta.</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Comida de verdade, congelada e pronta em 3 minutos.
              <strong className="text-foreground"> Sem dieta maluca, sem cozinha, sem estresse.</strong>
            </p>

            {/* Image gallery */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {KIT_IMAGES.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Marmita fit ${i + 1}`}
                  className="w-40 h-40 object-cover rounded-xl flex-shrink-0 snap-center shadow-sm border border-border"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-extrabold text-primary">R$ {KIT_PRICE},00</span>
              <div className="text-left">
                <span className="text-xs text-muted-foreground line-through">R$ 35,00/un</span>
                <p className="text-sm font-bold text-primary">R$ {(KIT_PRICE / KIT_TOTAL_MEALS).toFixed(2).replace('.', ',')}/marmita</p>
              </div>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 text-center">
              <p className="text-xs font-bold text-destructive">⏳ Pedidos confirmados hoje entram na produção da próxima entrega</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Vagas limitadas por lote — garanta a sua agora</p>
            </div>

            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">🚚 Entrega grátis</span>
              <span className="inline-flex items-center gap-1 font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">🔒 Compra segura</span>
            </div>

            <Button
              size="lg"
              className="w-full text-base font-bold py-5 rounded-xl shadow-lg mt-2"
              onClick={scrollToCheckout}
            >
              Quero minhas marmitas →
            </Button>
            <p className="text-[11px] text-muted-foreground">Preencha o formulário abaixo e garanta seu kit</p>
          </div>
        </section>

        {/* ===== BENEFITS ===== */}
        <section className="px-4 py-8">
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-foreground text-center mb-5">
              Por que milhares de pessoas estão trocando o iFood por isso?
            </h2>

            <div className="grid gap-3">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <b.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <p className="text-sm text-foreground leading-snug pt-1.5">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== COMO FUNCIONA ===== */}
        <section className="px-4 py-8 bg-muted/30">
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-foreground text-center mb-5">
              Como funciona? É simples demais.
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {STEPS.map((s, i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mx-auto mb-2">
                    {s.step}
                  </div>
                  <p className="font-bold text-sm text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CARDÁPIO ===== */}
        <section className="px-4 py-8">
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              🍽️ Cardápio da Semana
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-4">6 sabores que se revezam — você não enjoa nunca</p>

            <div className="grid gap-2">
              {KIT_FLAVORS.map((flavor, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {flavor.qty}x
                  </span>
                  <span className="text-sm text-foreground">{flavor.name}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              ✅ Linha <strong>Fit</strong> — balanceadas para emagrecimento
            </p>
          </div>
        </section>

        {/* ===== PROVA DE VALOR ===== */}
        <section className="px-4 py-8 bg-muted/30">
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Compare e veja a economia
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-card border border-destructive/30">
                <p className="text-xs text-muted-foreground mb-1">🍔 iFood / Comer fora</p>
                <p className="text-2xl font-extrabold text-destructive">R$ 35-50</p>
                <p className="text-xs text-muted-foreground">por refeição</p>
              </div>
              <div className="p-4 rounded-xl bg-card border-2 border-primary">
                <p className="text-xs text-muted-foreground mb-1">🥗 Kit Dieta Já</p>
                <p className="text-2xl font-extrabold text-primary">R$ 24,95</p>
                <p className="text-xs text-muted-foreground">por refeição</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Você <strong className="text-foreground">economiza até R$ 500/mês</strong> e ainda emagrece.
            </p>
          </div>
        </section>

        {/* ===== PROVA SOCIAL ===== */}
        <section className="px-4 py-8">
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-foreground text-center mb-4">
              Quem provou, aprovou ⭐
            </h2>
            <div className="grid gap-3">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground italic">"{t.text}"</p>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">— {t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ===== FAQ ===== */}
        <section className="px-4 py-8">
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-foreground text-center mb-4">
              Dúvidas frequentes
            </h2>
            <div className="grid gap-2">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-3.5 text-left"
                  >
                    <span className="text-sm font-semibold text-foreground">{item.q}</span>
                    <span className="text-muted-foreground text-lg leading-none">{openFaq === i ? '−' : '+'}</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-3.5 pb-3.5 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA INTERMEDIÁRIO ===== */}
        <section className="px-4 py-6 bg-primary/10">
          <div className="max-w-lg mx-auto text-center space-y-3">
            <p className="text-sm font-bold text-foreground">
              🔥 Últimas vagas dessa semana — garanta antes que esgote
            </p>
            <Button
              size="lg"
              className="w-full text-base font-bold py-5 rounded-xl shadow-lg"
              onClick={scrollToCheckout}
            >
              Quero começar agora →
            </Button>
          </div>
        </section>

        {/* ===== CHECKOUT ===== */}
        <section id="checkout" className="px-4 py-8 bg-muted/30">
          <div className="max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-center text-foreground mb-1">
              Garanta seu Kit agora 🚀
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Preencha seus dados e receba suas marmitas em casa
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 bg-card p-4 rounded-xl border border-border shadow-sm">
              <div>
                <Label htmlFor="name" className="text-xs font-medium">Nome completo</Label>
                <Input id="name" placeholder="Seu nome" {...register("name")} className="mt-1 h-11" />
                {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Controller name="email" control={control} render={({ field }) => (
                  <EmailAutocomplete id="email" value={field.value} onChange={field.onChange} className="mt-1" error={!!errors.email} />
                )} />
                {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs font-medium">WhatsApp</Label>
                <Controller name="phone" control={control} render={({ field }) => {
                  const cleanValue = (() => { const d = (field.value || '').replace(/\D/g, ''); return d.startsWith('55') && d.length > 11 ? d.slice(2) : d; })();
                  const status = getPhoneStatus(cleanValue);
                  return (
                    <div className="relative flex mt-1">
                      <div className="flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs font-medium select-none">🇧🇷 +55</div>
                      <div className="relative flex-1">
                        <Input id="phone" type="tel" inputMode="numeric" placeholder="(77) 99100-1658" value={formatPhone(cleanValue)}
                          onChange={(e) => { let raw = e.target.value.replace(/\D/g, '').slice(0, 11); if (raw.startsWith('55') && raw.length > 11) raw = raw.slice(2); field.onChange(raw); }}
                          className={`rounded-l-none h-11 pr-9 ${status.color === 'green' ? 'border-green-500' : status.color === 'red' ? 'border-destructive' : ''}`}
                        />
                        {cleanValue.length > 0 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {status.color === 'green' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {status.color === 'red' && <XCircle className="w-4 h-4 text-destructive" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }} />
                {errors.phone && <p className="text-xs text-destructive mt-0.5">{errors.phone.message}</p>}
              </div>

              <div>
                <Label htmlFor="cpf" className="text-xs font-medium">CPF</Label>
                <Controller name="cpf" control={control} render={({ field }) => (
                  <Input id="cpf" type="tel" inputMode="numeric" placeholder="000.000.000-00"
                    value={formatCPF(field.value || '')}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="mt-1 h-11"
                  />
                )} />
                {errors.cpf && <p className="text-xs text-destructive mt-0.5">{errors.cpf.message}</p>}
              </div>

              <div>
                <Label htmlFor="address" className="text-xs font-medium">Endereço de entrega</Label>
                <Input id="address" placeholder="Rua, número, bairro" {...register("address")} className="mt-1 h-11" />
                {errors.address && <p className="text-xs text-destructive mt-0.5">{errors.address.message}</p>}
              </div>

              {/* Payment method */}
              <div className="pt-1">
                <Label className="text-xs font-medium">Forma de pagamento</Label>
                <RadioGroup defaultValue="pix" onValueChange={(v) => setValue("paymentMethod", v as "pix" | "credit_card")} className="mt-1.5 grid grid-cols-2 gap-2">
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'pix' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <RadioGroupItem value="pix" id="pix" className="sr-only" />
                    <Label htmlFor="pix" className="cursor-pointer flex items-center gap-1.5 text-sm font-medium">
                      <QrCode className="w-4 h-4 text-primary" /> PIX
                    </Label>
                  </div>
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <RadioGroupItem value="credit_card" id="credit_card" className="sr-only" />
                    <Label htmlFor="credit_card" className="cursor-pointer flex items-center gap-1.5 text-sm font-medium">
                      <CreditCard className="w-4 h-4 text-primary" /> Cartão
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kit ({KIT_TOTAL_MEALS} marmitas)</span>
                  <span>R$ {KIT_PRICE},00</span>
                </div>
                <div className="flex justify-between text-xs text-primary">
                  <span>🚚 Entrega</span>
                  <span className="font-medium">Grátis</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>Total</span>
                  <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full text-base font-bold py-5 rounded-xl" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processando...</> : "Quero minhas marmitas →"}
              </Button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Compra segura</span>
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Entrega grátis</span>
              </div>
            </form>
          </div>
        </section>

        {/* ===== RODAPÉ FINAL ===== */}
        <section className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Dieta Já — Todos os direitos reservados.
          </p>
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
