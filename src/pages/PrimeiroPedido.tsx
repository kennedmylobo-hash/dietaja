import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Clock, Flame, ShieldCheck, Truck, ChefHat, Snowflake,
  AlertTriangle, Smartphone, CreditCard, CheckCircle2, Tag, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sanitizeCustomerName } from "@/lib/name-sanitizer";
import { validateCPF, formatCPF } from "@/lib/cpf";
import { formatPhone } from "@/lib/phone";
import { getUTMParams } from "@/lib/utm";
import { EmailAutocomplete } from "@/components/EmailAutocomplete";
import PixPaymentModal from "@/components/PixPaymentModal";
import { useTenantId } from "@/hooks/useTenantId";
import { Helmet } from "react-helmet-async";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";

const trackGA4 = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
};

// ===== PRICING =====
const COUPON_CODE = "PRIMEIRO20";
const DISCOUNT_PERCENT = 20;

const KITS = {
  fit: {
    id: "kit-primeiro-fit",
    label: "FIT",
    line_type: "emagrecimento" as const,
    weight: 300,
    fullPrice: 249.9,
    finalPrice: 199.92,
    perMeal: 19.99,
    name: "Kit Primeiro Pedido FIT — 10 marmitas 300g",
    emoji: "🥗",
    tagline: "Linha emagrecimento — proteína magra + baixa caloria",
    color: "text-primary",
  },
  fitness: {
    id: "kit-primeiro-fitness",
    label: "FITNESS",
    line_type: "hipertrofia" as const,
    weight: 450,
    fullPrice: 312.4,
    finalPrice: 249.92,
    perMeal: 24.99,
    name: "Kit Primeiro Pedido FITNESS — 10 marmitas 450g",
    emoji: "💪",
    tagline: "Linha hipertrofia — porções maiores + mais proteína",
    color: "text-orange-600",
  },
} as const;

type KitLine = keyof typeof KITS;

// ===== INGREDIENTES (para quiz de restrições) =====
const INGREDIENT_GROUPS: { label: string; emoji: string; items: string[] }[] = [
  {
    label: "Proteínas",
    emoji: "🥩",
    items: [
      "Almôndegas",
      "Carne em cubos",
      "Estrogonofe de carne",
      "Estrogonofe de frango",
      "Frango desfiado",
      "Frango em cubos",
      "Frango grelhado",
    ],
  },
  {
    label: "Carboidratos",
    emoji: "🍚",
    items: ["Arroz", "Aipim", "Purê de aipim", "Purê de batata doce", "Batata doce"],
  },
  { label: "Grãos", emoji: "🫘", items: ["Feijão"] },
  {
    label: "Salada",
    emoji: "🥗",
    items: ["Mix de salada (cenoura, abobrinha, vagem)"],
  },
];

// ===== COUNTDOWN HOOK (24h reset à meia-noite) =====
const useDailyCountdown = () => {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, midnight.getTime() - now.getTime());
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
};

// ===== FORM =====
const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  cpf: z.string().optional(),
  address: z.string().min(10, "Endereço completo é obrigatório"),
});
type FormData = z.infer<typeof formSchema>;

const PrimeiroPedido = () => {
  const tenantId = useTenantId();
  const countdown = useDailyCountdown();
  const [selectedKit, setSelectedKit] = useState<KitLine>("fit");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<"pix" | "card" | null>(null);
  const isSubmittingRef = useRef(false);

  const [pixModalData, setPixModalData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    orderId: string;
    paymentId: string;
    total: number;
    expirationDate: string;
  } | null>(null);

  const kit = KITS[selectedKit];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { address: "", cpf: "" },
  });

  // ViewContent
  useEffect(() => {
    trackMetaEvent({
      eventName: "ViewContent",
      eventId: generateMetaEventId("view"),
      params: {
        content_name: "Kit Primeiro Pedido",
        content_type: "product",
        content_ids: [kit.id],
        value: kit.finalPrice,
        currency: "BRL",
      },
      tenantId,
    });
    trackGA4("view_item", {
      currency: "BRL",
      value: kit.finalPrice,
      items: [{ item_id: kit.id, item_name: kit.name, price: kit.finalPrice, quantity: 1 }],
    });
  }, [selectedKit]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToCheckout = () => {
    trackMetaEvent({
      eventName: "InitiateCheckout",
      eventId: generateMetaEventId("checkout"),
      params: { content_name: "Kit Primeiro Pedido", value: kit.finalPrice, currency: "BRL" },
      tenantId,
    });
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleExcluded = (item: string) =>
    setExcluded((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));

  const buildItems = () => {
    const suffix = excluded.length > 0 ? ` (Restrições: sem ${excluded.join(", ")})` : "";
    return [
      {
        name: kit.name + suffix,
        quantity: 1,
        unitPrice: kit.finalPrice,
        totalPrice: kit.finalPrice,
        type: "kit-primeiro-pedido",
      },
    ];
  };

  const onSubmitCard = async (data: FormData) => {
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setLoadingMethod("card");

    trackMetaEvent({
      eventName: "Lead",
      eventId: generateMetaEventId("lead"),
      params: { content_name: "Primeiro Pedido - Cartão", value: kit.finalPrice, currency: "BRL" },
      tenantId,
      customerEmail: data.email,
      customerPhone: data.phone,
    });

    try {
      const redirectUrl = `${window.location.origin}/pagamento/sucesso`;
      const { data: response, error } = await supabase.functions.invoke("create-infinitepay-checkout", {
        body: {
          items: buildItems(),
          customer: {
            name: sanitizeCustomerName(data.name),
            email: data.email,
            phone: data.phone,
          },
          delivery: { option: "delivery", address: data.address, fee: 0 },
          redirect_url: redirectUrl,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;
      if (response?.success && response?.checkout_url) {
        window.open(response.checkout_url, "_self") || window.open(response.checkout_url, "_blank");
      } else {
        throw new Error(response?.error || "Erro ao gerar link de pagamento");
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro no pagamento",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
      isSubmittingRef.current = false;
    }
  };

  const onSubmitPix = async (data: FormData) => {
    if (isSubmittingRef.current || isLoading) return;
    const cpfDigits = data.cpf?.replace(/\D/g, "") || "";
    if (!cpfDigits || cpfDigits.length !== 11) {
      toast({ title: "CPF obrigatório", description: "Informe seu CPF para pagar via PIX.", variant: "destructive" });
      return;
    }
    if (!validateCPF(cpfDigits)) {
      toast({ title: "CPF inválido", description: "Verifique os números do CPF.", variant: "destructive" });
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setLoadingMethod("pix");

    trackMetaEvent({
      eventName: "Lead",
      eventId: generateMetaEventId("lead"),
      params: { content_name: "Primeiro Pedido - PIX", value: kit.finalPrice, currency: "BRL" },
      tenantId,
      customerEmail: data.email,
      customerPhone: data.phone,
    });

    try {
      const { data: response, error } = await supabase.functions.invoke("create-asaas-pix", {
        body: {
          items: buildItems(),
          customer: {
            name: sanitizeCustomerName(data.name),
            email: data.email,
            phone: data.phone,
            cpf: cpfDigits,
          },
          delivery: { option: "delivery", address: data.address, fee: 0 },
          cashback: { use: false, amount: 0 },
          coupon_code: COUPON_CODE,
          discount_amount: Math.round((kit.fullPrice - kit.finalPrice) * 100) / 100,
          utm_data: getUTMParams() || {},
          tenant_id: tenantId,
        },
      });

      if (error) throw error;
      if (response?.success && response?.qr_code) {
        setPixModalData({
          qrCode: response.qr_code,
          qrCodeBase64: response.qr_code_base64,
          orderId: response.order_id,
          paymentId: response.payment_id || response.order_id,
          total: response.total,
          expirationDate: response.expiration_date,
        });
      } else {
        throw new Error(response?.error || "Erro ao gerar PIX");
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao gerar PIX",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
      isSubmittingRef.current = false;
    }
  };

  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <Helmet>
        <title>Kit Primeiro Pedido — 10 Marmitas com 20% OFF | Dieta Já</title>
        <meta
          name="description"
          content="Experimente as marmitas Dieta Já: 10 unidades com 20% OFF no seu primeiro pedido. Cupom PRIMEIRO20 aplicado automaticamente. Oferta válida por 24h."
        />
        <meta property="og:title" content="Kit Primeiro Pedido — 10 Marmitas com 20% OFF" />
        <meta
          property="og:description"
          content="Oferta exclusiva pra quem ainda não conhece a Dieta Já. 20% OFF garantido nas 10 marmitas."
        />
        <link rel="canonical" href="https://dietajavca.com.br/primeiro-pedido" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* ===== COUNTDOWN BAR ===== */}
        <div className="bg-destructive text-destructive-foreground px-3 py-2 text-center text-xs font-bold sticky top-0 z-50 shadow-lg">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>OFERTA EXPIRA EM</span>
            <span className="font-mono bg-background/20 px-2 py-0.5 rounded tabular-nums">
              {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
            </span>
          </span>
        </div>

        {/* ===== HERO ===== */}
        <section className="bg-gradient-to-b from-primary/15 to-background px-4 pt-6 pb-8">
          <div className="max-w-lg mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              EXCLUSIVO PARA 1º PEDIDO
            </div>

            <h1 className="text-3xl font-extrabold text-foreground leading-tight">
              Kit Primeiro Pedido<br />
              <span className="text-primary">10 marmitas com 20% OFF 🔥</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Experimente a Dieta Já com desconto especial.
              <strong className="text-foreground"> Cupom PRIMEIRO20 aplicado automaticamente</strong> — só pra quem nunca pediu.
            </p>

            {/* ===== QUIZ FIT/FITNESS ===== */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-center text-foreground">
                👇 Qual é o seu objetivo? Escolha sua linha:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {(Object.keys(KITS) as KitLine[]).map((key) => {
                  const k = KITS[key];
                  const active = selectedKit === key;
                  const isFit = key === "fit";
                  const goal = isFit ? "Definição · Emagrecimento" : "Hipertrofia · Ganho de Massa";
                  const desc = isFit
                    ? "Pra quem quer perder gordura e definir. Proteína magra, pouco carbo."
                    : "Pra quem treina forte e quer crescer. Mais proteína + carbo de qualidade.";
                  const tags = isFit
                    ? ["Emagrecimento", "Low carb", "Cutting"]
                    : ["Hipertrofia", "Bulking", "+ Proteína"];
                  const accent = isFit ? "primary" : "orange-500";
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedKit(key)}
                      className={`relative text-left rounded-2xl p-4 border-2 transition-all ${
                        active
                          ? isFit
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-orange-500 bg-orange-500/5 shadow-md"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      {/* Radio */}
                      <div
                        className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          active
                            ? isFit
                              ? "border-primary bg-primary"
                              : "border-orange-500 bg-orange-500"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {active && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      <div className="flex items-center gap-2 pr-7">
                        <span className="text-2xl">{k.emoji}</span>
                        <div>
                          <h3 className="text-base font-extrabold text-foreground leading-tight">
                            Linha {k.label}
                          </h3>
                          <p className={`text-[11px] font-bold uppercase tracking-wide ${isFit ? "text-primary" : "text-orange-600"}`}>
                            {goal}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                        {desc} Porções de <strong className="text-foreground">{k.weight}g</strong>.
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              isFit ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-600"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">{kit.tagline}</p>

            {/* ===== PRICE BOX ===== */}
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-2 shadow-md">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-destructive" />
                <span className="font-bold text-destructive">PRIMEIRO20</span>
                <span className="text-muted-foreground">aplicado</span>
              </div>

              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground line-through">
                  De R$ {fmt(kit.fullPrice)}
                </p>
                <p className="text-4xl font-extrabold text-primary">
                  R$ {fmt(kit.finalPrice)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Apenas <strong className="text-foreground">R$ {fmt(kit.perMeal * 0.8)}</strong> por marmita
                </p>
              </div>

              <div className="bg-success/10 text-success rounded-lg py-1.5 px-3 text-xs font-bold inline-block">
                💰 Você economiza R$ {fmt(kit.fullPrice - kit.finalPrice)}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full text-base font-bold py-6 rounded-xl shadow-lg"
              onClick={scrollToCheckout}
            >
              🚀 Garantir Meu Desconto Agora
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Compra única · Sem assinatura · Entrega grátis
            </p>
          </div>
        </section>


        {/* ===== BENEFITS ===== */}
        <section className="px-4 py-8 bg-card">
          <div className="max-w-lg mx-auto space-y-4">
            <h2 className="text-xl font-extrabold text-center text-foreground">
              Por que experimentar?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Snowflake, t: "Congeladas", d: "Guarde no freezer" },
                { icon: Clock, t: "Pronta em 4min", d: "Micro-ondas" },
                { icon: Flame, t: "Balanceadas", d: "Proteína + fibra" },
                { icon: Truck, t: "Entrega grátis", d: "Sem taxa extra" },
                { icon: ChefHat, t: "Sabor caseiro", d: "Receitas testadas" },
                { icon: ShieldCheck, t: "Sem compromisso", d: "Compra única" },
              ].map((b, i) => (
                <div key={i} className="bg-background rounded-xl p-3 border border-border">
                  <b.icon className="w-5 h-5 text-primary mb-1.5" />
                  <p className="text-sm font-bold text-foreground">{b.t}</p>
                  <p className="text-xs text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="px-4 py-8">
          <div className="max-w-lg mx-auto space-y-4">
            <h2 className="text-xl font-extrabold text-center text-foreground">Como funciona</h2>
            <div className="space-y-3">
              {[
                { n: "1", t: "Escolha a linha", d: "FIT (300g) ou FITNESS (450g) — você decide." },
                { n: "2", t: "Pague com 20% OFF", d: "PIX ou cartão. Cupom PRIMEIRO20 já aplicado." },
                { n: "3", t: "Receba em casa", d: "Entregamos as 10 marmitas congeladas, prontas pra freezer." },
                { n: "4", t: "Aproveite", d: "4 min no micro-ondas e tá pronto. Simples assim." },
              ].map((s) => (
                <div key={s.n} className="flex gap-3 bg-card border border-border rounded-xl p-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center">
                    {s.n}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{s.t}</p>
                    <p className="text-xs text-muted-foreground">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CHECKOUT ===== */}
        <section id="checkout" className="px-4 py-8 bg-gradient-to-b from-background to-primary/5">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                Expira em {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
              </div>
              <h2 className="text-2xl font-extrabold text-foreground">Garanta seu kit</h2>
              <p className="text-sm text-muted-foreground">
                Linha <strong className="text-foreground">{kit.label}</strong> · 10 marmitas ·{" "}
                <span className="text-primary font-bold">R$ {fmt(kit.finalPrice)}</span>
              </p>
            </div>

            <form className="space-y-3 bg-card border border-border rounded-2xl p-5 shadow-md">
              <div>
                <Label htmlFor="name" className="text-xs font-bold">Nome completo</Label>
                <Input id="name" {...register("name")} placeholder="Seu nome" className="mt-1" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-bold">Email</Label>
                <EmailAutocomplete
                  value={watch("email") || ""}
                  onChange={(v) => setValue("email", v, { shouldValidate: true })}
                  placeholder="seu@email.com"
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs font-bold">WhatsApp</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="(77) 9 9999-9999"
                  className="mt-1"
                  onChange={(e) => setValue("phone", formatPhone(e.target.value), { shouldValidate: true })}
                  value={watch("phone") || ""}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <Label htmlFor="cpf" className="text-xs font-bold">
                  CPF <span className="text-muted-foreground font-normal">(obrigatório para PIX)</span>
                </Label>
                <Input
                  id="cpf"
                  {...register("cpf")}
                  placeholder="000.000.000-00"
                  className="mt-1"
                  onChange={(e) => setValue("cpf", formatCPF(e.target.value))}
                  value={watch("cpf") || ""}
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-xs font-bold">Endereço de entrega</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Rua, número, bairro, cidade"
                  className="mt-1"
                />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              </div>

              {/* Resumo */}
              <div className="bg-primary/5 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="line-through">R$ {fmt(kit.fullPrice)}</span>
                </div>
                <div className="flex justify-between text-success font-bold">
                  <span>Cupom PRIMEIRO20</span>
                  <span>− R$ {fmt(kit.fullPrice - kit.finalPrice)}</span>
                </div>
                <div className="flex justify-between text-foreground font-extrabold text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">R$ {fmt(kit.finalPrice)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button
                  type="button"
                  size="lg"
                  className="w-full font-bold"
                  onClick={handleSubmit(onSubmitPix)}
                  disabled={isLoading}
                >
                  {loadingMethod === "pix" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 mr-1.5" /> Pagar com PIX
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full font-bold border-2"
                  onClick={handleSubmit(onSubmitCard)}
                  disabled={isLoading}
                >
                  {loadingMethod === "card" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-1.5" /> Cartão
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <CheckCircle2 className="w-3 h-3 text-success" />
                Pagamento 100% seguro · Confirmação imediata
              </div>
            </form>
          </div>
        </section>

        {/* ===== FOOTER MICRO ===== */}
        <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
          <p>Dieta Já · Marmitas congeladas balanceadas</p>
          <p className="mt-1">Cupom PRIMEIRO20 válido apenas para o primeiro pedido por cliente.</p>
        </footer>

        {pixModalData && (
          <PixPaymentModal
            open={!!pixModalData}
            onOpenChange={(o) => !o && setPixModalData(null)}
            qrCode={pixModalData.qrCode}
            qrCodeBase64={pixModalData.qrCodeBase64}
            orderId={pixModalData.orderId}
            paymentId={pixModalData.paymentId}
            total={pixModalData.total}
            expirationDate={pixModalData.expirationDate}
            onPaymentSuccess={(orderNumber) => {
              setPixModalData(null);
              window.location.href = `/pagamento/sucesso?order=${orderNumber}`;
            }}
            onPaymentFailed={() => setPixModalData(null)}
          />
        )}
      </div>
    </>
  );
};

export default PrimeiroPedido;
