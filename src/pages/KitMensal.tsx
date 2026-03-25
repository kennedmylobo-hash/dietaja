import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2, XCircle, CreditCard, QrCode, Star, ShieldCheck, Truck, MessageCircle, ArrowDown } from "lucide-react";
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
  { qty: 3, emoji: "🍝", name: "Macarrão integral à bolonhesa", desc: "Alto em proteína, carboidrato de baixo IG" },
  { qty: 3, emoji: "🔵", name: "Almôndegas ao molho sugo com espaguete integral", desc: "Rico em ferro e proteína magra" },
  { qty: 3, emoji: "💚", name: "Estrogonofe de carne com arroz e mix de salada", desc: "Clássico reconfortante, versão fit" },
  { qty: 3, emoji: "🍗", name: "Estrogonofe de frango com arroz e mix de salada", desc: "Proteína magra, baixo em gordura" },
  { qty: 4, emoji: "🥘", name: "Escondidinho de carne com purê de aipim", desc: "Comfort food sem culpa, rico em fibras" },
  { qty: 4, emoji: "🍋", name: "Frango ao molho de maracujá com purê de batata doce", desc: "Anti-inflamatório, sabor agridoce incrível" },
];

const PAIN_POINTS = [
  { emoji: "😩", title: '"Não tenho tempo de cozinhar todo dia"', desc: "Você chega cansado, o freezer tá vazio, e o delivery de fast food parece a única saída." },
  { emoji: "🍔", title: '"Acabo comendo besteira por falta de opção"', desc: "Lanches, frituras e fast food viram rotina não por querer, mas por necessidade." },
  { emoji: "💸", title: '"Comida saudável é cara e trabalhosa"', desc: "Preparar refeições equilibradas exige tempo, conhecimento e ingredientes específicos." },
  { emoji: "📉", title: '"Começo a dieta mas não consigo manter"', desc: "Sem estrutura e praticidade, qualquer dieta perde para a correria do dia a dia." },
];

const STEPS = [
  { step: "1", title: "Escolha seu Kit", desc: "Preencha o formulário aqui embaixo e reserve seu kit mensal." },
  { step: "2", title: "Confirme o pagamento", desc: "Pague via PIX ou cartão em poucos segundos, com total segurança." },
  { step: "3", title: "Receba em casa", desc: "Entregamos de segunda a sexta, congelado e pronto pra guardar." },
  { step: "4", title: "Aqueça e aproveite", desc: "4 minutos no micro-ondas. Uma refeição saborosa e equilibrada todo dia." },
];

const BENEFITS = [
  { emoji: "🧊", title: "Congelado = mais praticidade", desc: "Guarde no freezer e tenha sempre uma refeição pronta. Sem desperdício, sem correria, sem desculpa." },
  { emoji: "🥗", title: "Nutricionalmente balanceadas", desc: "Cada marmita foi pensada para ajudar no emagrecimento sem passar fome. Proteína, fibra e sabor na medida certa." },
  { emoji: "🚚", title: "Entrega grátis toda semana", desc: "Sem taxas escondidas. O preço que você vê é o que você paga — com entrega na sua porta." },
  { emoji: "⏱️", title: "Pronta em 4 minutos", desc: "Micro-ondas ou banho-maria. Sua refeição fica pronta mais rápido do que qualquer app de delivery chegaria." },
  { emoji: "😋", title: "Sabor que faz você querer repetir", desc: "96% dos nossos clientes renovam o kit no mês seguinte. Não é por obrigação — é porque gostaram de verdade." },
  { emoji: "🔓", title: "Sem fidelidade", desc: "Você compra mês a mês, sem contratos ou taxas de cancelamento. Sem risco nenhum pra você." },
];

const TESTIMONIALS = [
  { name: "Ana Paula S.", duration: "Cliente há 3 meses", text: "Perdi 6kg em 2 meses comendo as marmitas da Javca. Nunca imaginei que seria tão fácil manter a dieta. Já renovei pela terceira vez!", stars: 5 },
  { name: "Ricardo M.", duration: "Cliente há 5 meses", text: "Sou super ocupado e sempre comia mal. Agora tenho 20 refeições prontas no freezer. O frango ao molho de maracujá é incrível!", stars: 5 },
  { name: "Fernanda L.", duration: "Cliente há 2 meses", text: "Comida boa, entrega no prazo e ainda emagreci. O melhor custo-benefício que encontrei. Vale cada centavo dos R$ 24,90.", stars: 5 },
];

const FAQ_ITEMS = [
  { q: "É gostoso mesmo?", a: "Sim! São receitas caseiras com tempero natural. Nossos clientes dizem que nem parece comida de dieta." },
  { q: "Vou enjoar de comer sempre a mesma coisa?", a: "Não! São 6 sabores diferentes que se revezam durante a semana. Variedade é garantida." },
  { q: "A porção é grande o suficiente?", a: "Sim! Nossas marmitas têm em média 350-400g, uma refeição completa com proteína, carboidrato e salada." },
  { q: "Funciona pra emagrecer?", a: "Sim! Todas são da linha Fit, balanceadas nutricionalmente. Combinadas com bons hábitos, os resultados aparecem já nas primeiras semanas." },
  { q: "Preciso cozinhar alguma coisa?", a: "Nada! É só tirar do freezer, aquecer no micro-ondas por 3-4 minutos e comer. Zero preparo." },
  { q: "Como funciona a entrega?", a: "Entregamos na sua casa, grátis. As marmitas chegam congeladas e prontas para armazenar no freezer." },
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

// Dark green palette
const darkBg = "bg-[#1a3a1a]";
const darkBgAlt = "bg-[#244024]";
const darkCard = "bg-[#2a4e2a]";

const KitMensal = () => {
  const navigate = useNavigate();
  const tenantId = useTenantId();
  const whatsappLink = `https://wa.me/5577991001658?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o Kit Mensal de Marmitas 🍽️')}`;
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
            items: [{ name: `Kit Mensal Emagrecimento - ${KIT_TOTAL_MEALS} marmitas Fit`, quantity: 1, unitPrice: KIT_PRICE, totalPrice: KIT_PRICE, type: "kit-mensal" }],
            customer: { name: sanitizeCustomerName(data.name), email: data.email, phone: data.phone, cpf: cpfDigits },
            delivery: { option: 'delivery', address: data.address, fee: 0 },
            tenant_id: tenantId,
          },
        });
        if (error) throw error;
        if (response?.success && response?.qr_code) {
          setPixModalData({ qrCode: response.qr_code, qrCodeBase64: response.qr_code_base64, orderId: response.order_id, paymentId: response.payment_id, total: response.total, expirationDate: response.expiration_date });
          toast({ title: "PIX gerado!", description: "Escaneie o QR Code ou copie o código para pagar." });
        } else throw new Error(response?.error || 'Erro ao gerar PIX');
      } else {
        const { data: response, error } = await supabase.functions.invoke('create-asaas-credit', {
          body: {
            item_name: `Kit Mensal Emagrecimento - ${KIT_TOTAL_MEALS} marmitas Fit`,
            amount: total,
            customer: { name: sanitizeCustomerName(data.name), email: data.email, phone: data.phone, cpf: cpfDigits },
            delivery: { option: 'delivery', address: data.address, fee: 0 },
            tenant_id: tenantId,
          },
        });
        if (error) throw error;
        if (response?.success && response?.payment_link) window.location.href = response.payment_link;
        else throw new Error(response?.error || 'Erro ao gerar link de pagamento');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: "Erro no pagamento", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Kit Mensal Emagrecimento - 20 Marmitas Fit | Dieta Já</title>
        <meta name="description" content="Emagreça sem cozinhar. 20 marmitas fit congeladas entregues na sua porta por R$24,90 cada. Entrega grátis." />
      </Helmet>

      <div className="min-h-screen">

        {/* ===== HERO — Dark Green ===== */}
        <section className={`${darkBg} px-4 pt-10 pb-10`}>
          <div className="max-w-2xl mx-auto">
            {/* Images */}
            <div className="flex gap-2.5 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {KIT_IMAGES.map((img, i) => (
                <img key={i} src={img} alt={`Marmita fit ${i + 1}`}
                  className="w-44 h-44 object-cover rounded-2xl flex-shrink-0 snap-center shadow-lg border border-white/10"
                  loading={i === 0 ? "eager" : "lazy"} />
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mt-6">
              20 marmitas fit<br />
              por <span className="text-green-400 italic">R$ 24,90</span> cada.<br />
              Emagreça com gostinho.
            </h1>

            <p className="text-base text-white/70 mt-4 leading-relaxed max-w-lg">
              Marmitas congeladas balanceadas, entregues na sua porta de segunda a sexta.
              Sem tempo de cozinhar? A gente resolve — <strong className="text-white">entrega grátis.</strong>
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-white">R$ 499</span>
                  <span className="text-green-400 text-sm font-semibold">R$ 24,90 por marmita</span>
                </div>
                <p className="text-white/50 text-sm mt-0.5">Entrega grátis inclusa</p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-5">
              {["🥗 Nutricionalmente balanceadas", "🧊 Congeladas e prontas", "🚚 Entrega grátis", "⏱️ Prontas em 4 minutos"].map((b, i) => (
                <span key={i} className={`text-xs font-medium px-3 py-1.5 rounded-full ${darkCard} text-white/80 border border-white/10`}>{b}</span>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto mt-6 text-base font-bold py-5 px-8 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg"
              onClick={scrollToCheckout}
            >
              🍽️ Quero meu Kit Mensal
            </Button>
            <p className="text-xs text-white/40 mt-2">Sem fidelidade. Cancele quando quiser.</p>
          </div>
        </section>

        {/* ===== VOCÊ SE IDENTIFICA? — Dark ===== */}
        <section className={`${darkBgAlt} px-4 py-12`}>
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-bold text-green-400 tracking-widest uppercase mb-2">Você se identifica?</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-2">
              A semana corrida está<br />sabotando sua dieta?
            </h2>
            <p className="text-sm text-white/60 mb-8 max-w-md">
              Reconheça esses momentos — e foi exatamente para isso que criamos o Kit Mensal.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className={`${darkCard} border border-white/10 rounded-xl p-5`}>
                  <span className="text-2xl">{p.emoji}</span>
                  <p className="font-bold text-white text-sm mt-3">{p.title}</p>
                  <p className="text-xs text-white/60 mt-1.5 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center my-6">
              <ArrowDown className="w-8 h-8 text-green-400 animate-bounce" />
            </div>

            <div className={`${darkCard} border border-green-500/30 rounded-xl p-5`}>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                ✅ A solução que faltava:
              </p>
              <p className="text-sm text-white/70 mt-2 leading-relaxed">
                20 marmitas fit, balanceadas por especialistas, congeladas e prontas pra consumir em 4 minutos. Você só esquenta e come. <strong className="text-white">Sem culpa, sem trabalho, sem prejuízo.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ===== COMO FUNCIONA — Light ===== */}
        <section className="bg-[#faf8f4] px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-bold text-green-700 tracking-widest uppercase mb-2">Simples assim</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#1a1a1a] leading-tight mb-2">Como funciona?</h2>
            <p className="text-sm text-[#666] mb-8">Do pedido ao seu prato em 4 passos descomplicados.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STEPS.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-extrabold text-xl mx-auto mb-3 border-2 border-green-200">
                    {s.step}
                  </div>
                  <p className="font-bold text-sm text-[#1a1a1a]">{s.title}</p>
                  <p className="text-xs text-[#888] mt-1 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CARDÁPIO — Light Green ===== */}
        <section className="bg-[#f0f5e8] px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-bold text-green-700 tracking-widest uppercase mb-2">Cardápio do Kit</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#1a1a1a] leading-tight mb-2">O que vem no seu kit?</h2>
            <p className="text-sm text-[#666] mb-6">20 marmitas cuidadosamente selecionadas, balanceadas para emagrecer sem abrir mão do sabor.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {KIT_FLAVORS.map((f, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-green-200/50 flex items-start gap-3">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-green-50 border border-green-200 text-green-800 flex items-center justify-center font-bold text-xs">
                    {f.qty}×
                  </span>
                  <div>
                    <p className="font-bold text-sm text-[#1a1a1a]">{f.emoji} {f.name}</p>
                    <p className="text-xs text-green-700 mt-0.5 italic">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total do kit */}
            <div className={`${darkBg} rounded-xl p-5 mt-6 flex items-center justify-between`}>
              <div>
                <p className="text-sm font-bold text-white">Total do kit</p>
                <p className="text-xs text-white/60 flex items-center gap-1">✅ Entrega grátis inclusa</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50 line-through">De R$ 698,00</p>
                <p className="text-3xl font-extrabold text-white">R$ 499,00</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== POR QUE ESCOLHER — Light ===== */}
        <section className="bg-[#faf8f4] px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-bold text-green-700 tracking-widest uppercase mb-2">Por que escolher a Dieta Javca?</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#1a1a1a] leading-tight mb-2">
              Tudo que você precisa,<br />sem nenhuma enrolação.
            </h2>
            <p className="text-sm text-[#666] mb-8">Outros deliveries vendem comida. A gente entrega resultado, praticidade e sabor no mesmo pacote.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BENEFITS.map((b, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-green-200/30 border-l-4 border-l-green-500">
                  <span className="text-2xl">{b.emoji}</span>
                  <p className="font-bold text-sm text-[#1a1a1a] mt-3">{b.title}</p>
                  <p className="text-xs text-[#888] mt-1.5 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== DEPOIMENTOS — Dark ===== */}
        <section className={`${darkBg} px-4 py-12`}>
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-bold text-green-400 tracking-widest uppercase mb-2">Quem já experimentou</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-2">
              Resultados reais de clientes reais
            </h2>
            <p className="text-sm text-white/60 mb-8">Mais de 1.200 pessoas já transformaram a alimentação com a Dieta Javca.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`${darkCard} rounded-xl p-5 border border-white/10`}>
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-white/90 italic leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-green-400">{t.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ — Light ===== */}
        <section className="bg-[#faf8f4] px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-bold text-green-700 tracking-widest uppercase mb-2">Dúvidas frequentes</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#1a1a1a] leading-tight mb-6">Tudo que você precisa saber</h2>

            <div className="grid gap-2">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="rounded-xl border border-green-200/50 bg-white overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="text-sm font-bold text-[#1a1a1a]">{item.q}</span>
                    <span className="text-[#888] text-xl leading-none font-light">{openFaq === i ? '−' : '+'}</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-[#666] leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA FINAL — Dark ===== */}
        <section className={`${darkBg} px-4 py-10`}>
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-bold text-red-400 tracking-widest uppercase mb-2 animate-pulse">⏳ Oferta encerra em breve</p>
            <h2 className="text-xl md:text-3xl font-extrabold text-white mb-2">
              Pedidos confirmados hoje entram na<br />produção da próxima entrega
            </h2>
            <p className="text-sm text-white/60 mb-6">Vagas limitadas por lote — garanta a sua agora</p>
            <Button
              size="lg"
              className="text-base font-bold py-5 px-10 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg"
              onClick={scrollToCheckout}
            >
              🍽️ Quero meu Kit Mensal →
            </Button>
          </div>
        </section>

        {/* ===== CHECKOUT — Light ===== */}
        <section id="checkout" className="bg-[#f0f5e8] px-4 py-12">
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-extrabold text-center text-[#1a1a1a] mb-1">
              Garanta seu Kit agora 🚀
            </h2>
            <p className="text-xs text-[#888] text-center mb-5">
              Preencha seus dados e receba suas marmitas em casa
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 bg-white p-5 rounded-2xl border border-green-200/50 shadow-sm">
              <div>
                <Label htmlFor="name" className="text-xs font-semibold text-[#333]">Nome completo</Label>
                <Input id="name" placeholder="Seu nome" {...register("name")} className="mt-1 h-11 rounded-lg" />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-semibold text-[#333]">Email</Label>
                <Controller name="email" control={control} render={({ field }) => (
                  <EmailAutocomplete id="email" value={field.value} onChange={field.onChange} className="mt-1" error={!!errors.email} />
                )} />
                {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs font-semibold text-[#333]">WhatsApp</Label>
                <Controller name="phone" control={control} render={({ field }) => {
                  const cleanValue = (() => { const d = (field.value || '').replace(/\D/g, ''); return d.startsWith('55') && d.length > 11 ? d.slice(2) : d; })();
                  const status = getPhoneStatus(cleanValue);
                  return (
                    <div className="relative flex mt-1">
                      <div className="flex items-center px-2.5 rounded-l-lg border border-r-0 border-input bg-gray-50 text-gray-500 text-xs font-medium select-none">🇧🇷 +55</div>
                      <div className="relative flex-1">
                        <Input id="phone" type="tel" inputMode="numeric" placeholder="(77) 99100-1658" value={formatPhone(cleanValue)}
                          onChange={(e) => { let raw = e.target.value.replace(/\D/g, '').slice(0, 11); if (raw.startsWith('55') && raw.length > 11) raw = raw.slice(2); field.onChange(raw); }}
                          className={`rounded-l-none rounded-r-lg h-11 pr-9 ${status.color === 'green' ? 'border-green-500' : status.color === 'red' ? 'border-red-500' : ''}`}
                        />
                        {cleanValue.length > 0 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {status.color === 'green' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {status.color === 'red' && <XCircle className="w-4 h-4 text-red-500" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }} />
                {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone.message}</p>}
              </div>

              <div>
                <Label htmlFor="cpf" className="text-xs font-semibold text-[#333]">CPF</Label>
                <Controller name="cpf" control={control} render={({ field }) => (
                  <Input id="cpf" type="tel" inputMode="numeric" placeholder="000.000.000-00"
                    value={formatCPF(field.value || '')}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="mt-1 h-11 rounded-lg" />
                )} />
                {errors.cpf && <p className="text-xs text-red-500 mt-0.5">{errors.cpf.message}</p>}
              </div>

              <div>
                <Label htmlFor="address" className="text-xs font-semibold text-[#333]">Endereço de entrega</Label>
                <Input id="address" placeholder="Rua, número, bairro" {...register("address")} className="mt-1 h-11 rounded-lg" />
                {errors.address && <p className="text-xs text-red-500 mt-0.5">{errors.address.message}</p>}
              </div>

              {/* Payment method */}
              <div className="pt-1">
                <Label className="text-xs font-semibold text-[#333]">Forma de pagamento</Label>
                <RadioGroup defaultValue="pix" onValueChange={(v) => setValue("paymentMethod", v as "pix" | "credit_card")} className="mt-1.5 grid grid-cols-2 gap-2">
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <RadioGroupItem value="pix" id="pix" className="sr-only" />
                    <Label htmlFor="pix" className="cursor-pointer flex items-center gap-1.5 text-sm font-semibold">
                      <QrCode className="w-4 h-4 text-green-600" /> PIX
                    </Label>
                  </div>
                  <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <RadioGroupItem value="credit_card" id="credit_card" className="sr-only" />
                    <Label htmlFor="credit_card" className="cursor-pointer flex items-center gap-1.5 text-sm font-semibold">
                      <CreditCard className="w-4 h-4 text-green-600" /> Cartão
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Total */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Kit ({KIT_TOTAL_MEALS} marmitas)</span>
                  <span className="font-medium">R$ {KIT_PRICE},00</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>🚚 Entrega</span>
                  <span className="font-semibold">Grátis</span>
                </div>
                <div className="flex justify-between font-extrabold text-lg pt-1.5">
                  <span>Total</span>
                  <span className="text-green-700">R$ {total.toFixed(2).replace(".", ",")}</span>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full text-base font-bold py-5 rounded-xl bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processando...</> : "🍽️ Quero minhas marmitas →"}
              </Button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-[#aaa] pt-1">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Compra segura</span>
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Entrega grátis</span>
              </div>
            </form>
          </div>
        </section>

        {/* ===== RODAPÉ ===== */}
        <section className={`${darkBg} px-4 py-6 text-center`}>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Dieta Javca — Todos os direitos reservados.
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
