import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Clock, Flame, ShieldCheck, Star, Truck, ChefHat, Snowflake, AlertTriangle, MessageCircle, Smartphone, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPhone, getPhoneStatus } from "@/lib/phone";
import { sanitizeCustomerName } from "@/lib/name-sanitizer";
import { validateCPF, formatCPF } from "@/lib/cpf";
import { getUTMParams } from "@/lib/utm";
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
  { qty: 3, emoji: "🍝", name: "Macarrão integral à bolonhesa", tag: "Alto em proteína, carboidrato de baixo IG" },
  { qty: 3, emoji: "🍳", name: "Almôndegas ao molho sugo com espaguete integral", tag: "Rico em ferro e proteína magra" },
  { qty: 3, emoji: "🥩", name: "Estrogonofe de carne com arroz e mix de salada", tag: "Clássico reconfortante, versão fit" },
  { qty: 3, emoji: "🍗", name: "Estrogonofe de frango com arroz e mix de salada", tag: "Proteína magra, baixo em gordura" },
  { qty: 4, emoji: "🍖", name: "Escondidinho de carne com purê de aipim", tag: "Comfort food sem culpa, rico em fibras" },
  { qty: 4, emoji: "🍋", name: "Frango ao molho de maracujá com purê de batata doce", tag: "Anti-inflamatório, sabor agridoce incrível" },
];

const BENEFITS = [
  { icon: Snowflake, title: "Congelado = mais praticidade", text: "Guarde no freezer e tenha sempre uma refeição pronta. Sem desperdício, sem correria, sem desculpa." },
  { icon: Flame, title: "Nutricionalmente balanceadas", text: "Cada marmita foi pensada para ajudar no emagrecimento sem passar fome. Proteína, fibra e sabor na medida certa." },
  { icon: Truck, title: "Entrega grátis toda semana", text: "Sem taxas escondidas. O preço que você vê é o que você paga — com entrega na sua porta, de segunda a sexta." },
  { icon: Clock, title: "Pronta em 4 minutos", text: "Micro-ondas ou banho-maria. Sua refeição fica pronta mais rápido do que qualquer app de delivery chegaria." },
  { icon: ChefHat, title: "Sabor que faz você querer repetir", text: "96% dos nossos clientes renovam o kit no mês seguinte. Não é por obrigação — é porque gostaram de verdade." },
  { icon: ShieldCheck, title: "Sem fidelidade", text: "Você compra mês a mês, sem contratos ou taxas de cancelamento. Sem risco nenhum pra você." },
];

const STEPS = [
  { step: "1", title: "Escolha seu Kit", desc: "Preencha o formulário aqui embaixo e reserve seu kit mensal." },
  { step: "2", title: "Confirme o pagamento", desc: "Pague via PIX ou cartão em poucos segundos, com total segurança." },
  { step: "3", title: "Receba em casa", desc: "Entregamos de segunda a sexta, congelado e pronto pra guardar." },
  { step: "4", title: "Aqueça e aproveite", desc: "4 minutos no micro-ondas. Uma refeição saborosa e equilibrada todo dia." },
];

const FAQ_ITEMS = [
  { q: "Quais formas de pagamento vocês aceitam?", a: "Aceitamos PIX (confirmação instantânea) e cartão de crédito. O pagamento é processado de forma segura e você recebe confirmação imediata para agendarmos a entrega." },
  { q: "Como funciona a entrega?", a: "Entregamos de segunda a sexta, congelado e pronto pra guardar no freezer. A entrega é grátis — sem taxas escondidas." },
  { q: "E se eu não gostar?", a: "Se qualquer marmita apresentar problema de qualidade — embalagem danificada, produto fora do padrão — entre em contato e fazemos a reposição imediata. Simples assim." },
  { q: "Preciso me comprometer por meses?", a: "Não! Sem fidelidade. Você compra mês a mês, sem contratos ou taxas de cancelamento. Cancele quando quiser." },
  { q: "Funciona pra emagrecer?", a: "Sim! Todas são da linha Fit, balanceadas nutricionalmente. Combinadas com bons hábitos, os resultados aparecem já nas primeiras semanas." },
  { q: "Quanto tempo dura no freezer?", a: "Nossas marmitas duram até 3 meses congeladas, mantendo sabor e nutrientes. Basta aquecer em 4 minutos no micro-ondas." },
];

const TESTIMONIALS = [
  { name: "Ana Paula S.", subtitle: "Cliente há 3 meses", text: "Perdi 6kg em 2 meses comendo as marmitas da Javca. Nunca imaginei que seria tão fácil manter a dieta. Já renovei pela terceira vez!", stars: 5 },
  { name: "Ricardo M.", subtitle: "Cliente há 5 meses", text: "Sou super ocupado e sempre comia mal. Agora tenho 20 refeições prontas no freezer. O frango ao molho de maracujá é incrível!", stars: 5 },
  { name: "Fernanda L.", subtitle: "Cliente há 2 meses", text: "Comida boa, entrega no prazo e ainda emagreci. O melhor custo-benefício que encontrei. Vale cada centavo dos R$ 24,90.", stars: 5 },
];

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  cpf: z.string().optional(),
  address: z.string().min(10, "Endereço completo é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

const scrollToCheckout = () => document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' });

const KitMensal = () => {
  const navigate = useNavigate();
  const tenantId = useTenantId();
  const whatsappLink = `https://wa.me/5577991001658?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o Kit Mensal de Marmitas 🍽️')}`;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<"pix" | "card" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);
  
  const [pixModalData, setPixModalData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    orderId: string;
    total: number;
    expirationDate: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
      cpf: "",
    },
  });

  const total = KIT_PRICE;

  const onSubmitCard = async (data: FormData) => {
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setLoadingMethod("card");

    try {
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/pagamento/sucesso`;

      const { data: response, error } = await supabase.functions.invoke('create-infinitepay-checkout', {
        body: {
          items: [{
            name: `Kit Mensal Emagrecimento - ${KIT_TOTAL_MEALS} marmitas Fit`,
            quantity: 1,
            totalPrice: KIT_PRICE,
            type: "kit-mensal",
          }],
          customer: {
            name: sanitizeCustomerName(data.name),
            email: data.email,
            phone: data.phone,
          },
          delivery: {
            option: 'delivery',
            address: data.address,
            fee: 0,
          },
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
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Tente novamente.",
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

    const cpfDigits = data.cpf?.replace(/\D/g, '') || '';
    if (!cpfDigits || cpfDigits.length !== 11) {
      toast({ title: "CPF obrigatório", description: "Informe seu CPF para pagamento via PIX.", variant: "destructive" });
      return;
    }
    if (!validateCPF(cpfDigits)) {
      toast({ title: "CPF inválido", description: "Verifique os números do CPF.", variant: "destructive" });
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setLoadingMethod("pix");

    try {
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
          cashback: { use: false, amount: 0 },
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
          total: response.total,
          expirationDate: response.expiration_date,
        });
        toast({ title: "PIX gerado com sucesso!", description: "Escaneie o QR Code ou copie o código para pagar." });
      } else {
        throw new Error(response?.error || 'Erro ao gerar PIX');
      }
    } catch (error) {
      console.error('PIX error:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
      isSubmittingRef.current = false;
    }
  };

  return (
    <>
      <Helmet>
        <title>Kit Mensal Emagrecimento - 20 Marmitas Fit | Dieta Já</title>
        <meta name="description" content="Emagreça com gostinho. 20 marmitas fit congeladas entregues na sua porta por R$24,90 cada. Entrega grátis." />
      </Helmet>

      <div className="min-h-screen bg-background">

        {/* ===== HERO ===== */}
        <section className="bg-gradient-to-b from-primary/15 to-background px-4 pt-8 pb-6">
          <div className="max-w-lg mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              🔥 Vagas limitadas para esta semana — 5 kits disponíveis
            </div>

            <p className="text-xs font-semibold text-primary tracking-wide uppercase">⭐ Oferta Exclusiva — Linha Fit</p>

            <h1 className="text-2xl font-extrabold text-foreground leading-tight">
              {KIT_TOTAL_MEALS} marmitas fit<br />
              <span className="text-primary">por R$ {(KIT_PRICE / KIT_TOTAL_MEALS).toFixed(2).replace('.', ',')} cada.</span>
            </h1>
            <p className="text-lg font-bold text-foreground">Emagreça com gostinho.</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Marmitas congeladas balanceadas, entregues na sua porta de segunda a sexta.
              <strong className="text-foreground"> Sem tempo de cozinhar? A gente resolve — entrega grátis.</strong>
            </p>

            {/* Auto-scrolling image carousel */}
            <AutoScrollGallery images={KIT_IMAGES} />

            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-extrabold text-primary">R$ {KIT_PRICE},00</span>
              <div className="text-left">
                <p className="text-sm font-bold text-primary">R$ {(KIT_PRICE / KIT_TOTAL_MEALS).toFixed(2).replace('.', ',')} por marmita</p>
                <p className="text-xs text-muted-foreground">Entrega grátis incluída</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">🥦 Nutricionalmente balanceadas</span>
              <span className="inline-flex items-center gap-1 font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">🧊 Congeladas e prontas</span>
              <span className="inline-flex items-center gap-1 font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">🚚 Entrega grátis</span>
              <span className="inline-flex items-center gap-1 font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">⏱️ Prontas em 4 minutos</span>
            </div>

            <Button
              size="lg"
              className="w-full text-base font-bold py-5 rounded-xl shadow-lg mt-2"
              onClick={scrollToCheckout}
            >
              🍽️ Quero meu Kit Mensal
            </Button>
            <p className="text-[11px] text-muted-foreground">Sem fidelidade. Cancele quando quiser.</p>
          </div>
        </section>

        {/* ===== SOCIAL PROOF STATS ===== */}
        <section className="px-4 py-6 bg-card border-y border-border">
          <div className="max-w-lg mx-auto text-center">
            <p className="text-xs mb-0.5">⭐⭐⭐⭐⭐</p>
            <p className="text-lg font-extrabold text-foreground">4,9 de avaliação</p>
            <p className="text-[10px] text-muted-foreground">Nota média dos nossos clientes</p>
          </div>
        </section>

        {/* ===== IDENTIFICAÇÃO / DOR ===== */}
        <section className="px-4 py-8">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-primary font-semibold text-center mb-1">Você se identifica?</p>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              A semana corrida está<br /><span className="text-primary">sabotando sua dieta?</span>
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-5">Reconhecemos esses momentos — e foi exatamente para isso que criamos o Kit Mensal.</p>

            <div className="grid gap-3">
              {[
                { emoji: "😩", title: "\u201CNão tenho tempo de cozinhar todo dia\u201D", desc: "Você chega cansado, o freezer tá vazio, e o delivery de fast food parece a única saída." },
                { emoji: "🍔", title: "\u201CAcabo comendo besteira por falta de opção\u201D", desc: "Lanches, frituras e fast food viram rotina não por querer, mas por necessidade." },
                { emoji: "💸", title: "\u201CComida saudável é cara e trabalhosa\u201D", desc: "Preparar refeições equilibradas exige tempo, conhecimento e ingredientes específicos." },
                { emoji: "📉", title: "\u201CComeço a dieta mas não consigo manter\u201D", desc: "Sem estrutura e praticidade, qualquer dieta perde para a correria do dia a dia." },
              ].map((pain, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <span className="text-2xl flex-shrink-0">{pain.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{pain.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pain.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">↓</p>
              <p className="text-sm font-bold text-primary">✅ A solução que faltava:</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {KIT_TOTAL_MEALS} marmitas fit, balanceadas por especialistas, congeladas e prontas pra consumir em 4 minutos. Você só esquenta e come. <strong className="text-foreground">Sem culpa, sem trabalho, sem prejuízo.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ===== COMO FUNCIONA ===== */}
        <section className="px-4 py-8 bg-muted/30">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-primary font-semibold text-center mb-1">Simples assim</p>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              Como funciona?
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-5">Do pedido ao seu prato em 4 passos descomplicados.</p>
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
            <p className="text-xs text-primary font-semibold text-center mb-1">Cardápio do Kit</p>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              O que vem no seu kit?
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-4">{KIT_TOTAL_MEALS} marmitas cuidadosamente selecionadas, balanceadas para emagrecer sem abrir mão do sabor.</p>

            <div className="grid gap-2">
              {KIT_FLAVORS.map((flavor, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {flavor.qty}x
                  </span>
                  <div>
                    <span className="text-sm text-foreground font-medium">{flavor.emoji} {flavor.name}</span>
                    <p className="text-[11px] text-muted-foreground">{flavor.tag}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground">Total do kit</p>
              <p className="text-xs text-primary font-medium mt-0.5">✅ Entrega grátis inclusa</p>
              <p className="text-xs text-muted-foreground line-through mt-1">De R$ 698,00</p>
              <p className="text-2xl font-extrabold text-primary">R$ {KIT_PRICE},00</p>
            </div>
          </div>
        </section>

        {/* ===== POR QUE ESCOLHER ===== */}
        <section className="px-4 py-8 bg-muted/30">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-primary font-semibold text-center mb-1">Por que escolher a Dieta Javca?</p>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              Tudo que você precisa,<br /><span className="text-primary">sem nenhuma enrolação.</span>
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-5">Outros deliveries vendem comida. A gente entrega resultado, praticidade e sabor no mesmo pacote.</p>

            <div className="grid gap-3">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <b.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{b.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PROVA SOCIAL ===== */}
        <section className="px-4 py-8">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-primary font-semibold text-center mb-1">Quem já experimentou</p>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              Resultados reais de clientes reais
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-4">Mais de 1.200 pessoas já transformaram a alimentação com a Dieta Javca.</p>
            <div className="grid gap-3">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground italic">"{t.text}"</p>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">— {t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="px-4 py-8 bg-muted/30">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-primary font-semibold text-center mb-1">Suas dúvidas, respondidas</p>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">
              Ainda com alguma dúvida?
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-4">Normal! A gente responde tudo aqui.</p>
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


        {/* ===== CHECKOUT ===== */}
        <section id="checkout" className="px-4 py-8 bg-muted/30">
          <div className="max-w-lg mx-auto">
            <p className="text-xs text-primary font-semibold text-center mb-1">Último passo</p>
            <h2 className="text-lg font-bold text-center text-foreground mb-1">
              Reserve seu Kit Mensal
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Preencha os dados abaixo e garanta suas {KIT_TOTAL_MEALS} marmitas fit com entrega grátis.
            </p>

            <form className="space-y-3 bg-card p-4 rounded-xl border border-border shadow-sm">
              <div>
                <Label htmlFor="name" className="text-xs font-medium">Nome completo</Label>
                <Input id="name" placeholder="Seu nome completo" {...register("name")} className="mt-1 h-11" />
                {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-medium">E-mail</Label>
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
                <Label htmlFor="address" className="text-xs font-medium">Endereço de entrega completo</Label>
                <Input id="address" placeholder="Rua, número, bairro, cidade" {...register("address")} className="mt-1 h-11" />
                {errors.address && <p className="text-xs text-destructive mt-0.5">{errors.address.message}</p>}
              </div>

              {/* CPF for PIX */}
              <div>
                <Label htmlFor="cpf" className="text-xs font-medium">
                  CPF <span className="text-muted-foreground">(obrigatório para PIX)</span>
                </Label>
                <Controller name="cpf" control={control} render={({ field }) => (
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={formatCPF(field.value || '')}
                    onChange={(e) => field.onChange(formatCPF(e.target.value))}
                    className="mt-1 h-11"
                  />
                )} />
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">🍱 Kit Mensal ({KIT_TOTAL_MEALS} marmitas)</span>
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

              {/* Two payment buttons */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <Button
                  type="button"
                  size="lg"
                  className="w-full text-base font-bold py-5 rounded-xl"
                  onClick={handleSubmit(onSubmitPix)}
                  disabled={isLoading}
                >
                  {loadingMethod === "pix" ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Gerando PIX...</>
                  ) : (
                    <><Smartphone className="w-5 h-5 mr-2" /> Garantir meu Kit via PIX</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full text-base font-bold py-5 rounded-xl border-primary/30 hover:bg-primary/5"
                  onClick={handleSubmit(onSubmitCard)}
                  disabled={isLoading}
                >
                  {loadingMethod === "card" ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Redirecionando...</>
                  ) : (
                    <><CreditCard className="w-5 h-5 mr-2" /> Garantir meu Kit via Cartão</>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> 🔒 Pagamento seguro</span>
                <span className="flex items-center gap-1">✅ Sem fidelidade</span>
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> 🚚 Entrega grátis</span>
              </div>
            </form>

            {/* PIX Payment Modal */}
            {pixModalData && (
              <PixPaymentModal
                open={!!pixModalData}
                onOpenChange={(open) => { if (!open) setPixModalData(null); }}
                qrCode={pixModalData.qrCode}
                qrCodeBase64={pixModalData.qrCodeBase64}
                total={pixModalData.total}
                paymentId={pixModalData.orderId}
                orderId={pixModalData.orderId}
                expirationDate={pixModalData.expirationDate}
                onPaymentSuccess={(orderNumber) => {
                  setPixModalData(null);
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
          </div>
        </section>

        {/* ===== RODAPÉ FINAL ===== */}
        <section className="px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Dieta Javca — Marmitas Congeladas Fit
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dúvidas? Fale conosco no WhatsApp: <a href={whatsappLink} className="text-primary font-medium hover:underline">(77) 99100-1658</a>
          </p>
        </section>

        {/* WhatsApp floating button */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-3 rounded-full shadow-lg transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Dúvidas?</span>
        </a>
      </div>

    </>
  );
};

export default KitMensal;
