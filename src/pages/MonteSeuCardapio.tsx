import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, Send, UtensilsCrossed, ArrowLeft, Mic, MicOff, ShoppingBag, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { CartProvider, useCart, FlavorSelection } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartFloatingButton from "@/components/CartFloatingButton";
import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";

type LineType = "emagrecimento" | "hipertrofia";

const LINE_CONFIG: Record<LineType, { label: string; weight: number; emoji: string; protein: number; carb: number; mix: number; description: string; objective: string }> = {
  emagrecimento: { label: "Fit", weight: 300, emoji: "🥗", protein: 100, carb: 150, mix: 50, description: "100g proteína + 150g carboidrato + 50g mix", objective: "Ideal para definição e emagrecimento" },
  hipertrofia: { label: "Fitness", weight: 450, emoji: "💪", protein: 150, carb: 200, mix: 100, description: "150g proteína + 200g carboidrato + 100g mix", objective: "Ideal para ganho de massa e hipertrofia" },
};

const getMaxFlavors = (qty: number) => {
  if (qty <= 7) return 3;
  if (qty <= 14) return 5;
  if (qty <= 21) return 7;
  return 10;
};

const formSchema = z.object({
  proteins: z.string().trim().min(3, "Informe pelo menos uma proteína").max(500),
  carbs: z.string().trim().min(3, "Informe pelo menos um carboidrato").max(500),
  mix: z.string().trim().min(3, "Informe pelo menos um item para o mix").max(500),
  quantity: z.number({ required_error: "Escolha a quantidade" }),
});

type FormData = z.infer<typeof formSchema>;

interface Flavor {
  name: string;
  protein: string;
  carb: string;
  mix: string;
  quantity: number;
}

const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

const MonteSeuCardapioContent = () => {
  const { brand, contact } = useTenantConfig();
  const tenantId = useTenantId();
  const { addItem, itemCount, showIdentificationModal, setShowIdentificationModal, customerInfo, setCustomerInfo, confirmAddItem } = useCart();

  useEffect(() => {
    trackMetaEvent({
      eventName: 'PageView',
      eventId: generateMetaEventId('pageview'),
      tenantId,
      params: { page: '/monte-seu-cardapio' },
    });
  }, [tenantId]);
  const [searchParams] = useSearchParams();
  const initialLine = searchParams.get("linha") === "hipertrofia" ? "hipertrofia" : "emagrecimento";
  const [loading, setLoading] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[] | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null);
  const [selectedLine, setSelectedLine] = useState<LineType>(initialLine);
  const [isRecording, setIsRecording] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [highlightNextStep, setHighlightNextStep] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showWaIdModal, setShowWaIdModal] = useState(false);
  const [isCreatingWaOrder, setIsCreatingWaOrder] = useState(false);
  const recognitionRef = useRef<any>(null);
  const lineSectionRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });


  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const parseTranscript = useCallback(async (transcript: string) => {
    if (!transcript || transcript.trim().length < 5) {
      toast.error("Não consegui entender. Tente falar novamente.");
      return;
    }
    setIsParsing(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 90000)
      );
      const result = await Promise.race([
        supabase.functions.invoke("parse-voice-preferences", { body: { transcript } }),
        timeoutPromise,
      ]) as { data: any; error: any };
      const { data, error } = result;
      if (error) {
        console.error("Parse error:", error);
        toast.error("Erro ao processar. Tente novamente.");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Melhoria 1: Feedback when all ingredients are empty
      if (!data?.proteins && !data?.carbs && !data?.mix) {
        toast.warning("Não encontramos esses ingredientes no nosso catálogo. Tente com outros!");
        return;
      }

      if (data?.proteins) setValue("proteins", data.proteins);
      if (data?.carbs) setValue("carbs", data.carbs);
      if (data?.mix) setValue("mix", data.mix);
      toast.success("Preferências preenchidas! Agora escolha a linha e quantidade abaixo ⬇️");
      setHighlightNextStep(true);
      setTimeout(() => {
        lineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      setTimeout(() => setHighlightNextStep(false), 4000);
    } catch (err: any) {
      console.error("Parse voice error:", err);
      if (err?.message === "timeout") {
        toast.error("Demorou demais. Tente novamente.");
      } else {
        toast.error("Erro de conexão. Tente novamente.");
      }
    } finally {
      setIsParsing(false);
      setInterimText("");
    }
  }, [setValue]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim += t;
        }
      }
      setInterimText(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        toast.error("Erro no microfone. Verifique as permissões.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        parseTranscript(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setInterimText("");
  }, [parseTranscript]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["marmita-packages-cardapio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marmita_packages")
        .select("quantity, unit_price, line_type, weight")
        .eq("active", true)
        .order("quantity");
      if (error) throw error;
      return data;
    },
  });

  const packagesByLine = useMemo(() => {
    if (!packages) return {};
    const map: Record<string, { quantity: number; unit_price: number }[]> = {};
    for (const p of packages) {
      const lt = p.line_type || "emagrecimento";
      if (!map[lt]) map[lt] = [];
      const exists = map[lt].find((x) => x.quantity === p.quantity);
      if (!exists) map[lt].push({ quantity: p.quantity, unit_price: p.unit_price });
    }
    return map;
  }, [packages]);

  const currentPackages = packagesByLine[selectedLine] || [];

  const selectedPackage = currentPackages.find((p) => p.quantity === selectedQuantity);
  const unitPrice = selectedPackage?.unit_price ?? 0;
  const totalPrice = selectedQuantity ? selectedQuantity * unitPrice : 0;

  const lineConfig = LINE_CONFIG[selectedLine];

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setFlavors(null);

    try {
      const { data: result, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          proteins: data.proteins,
          carbs: data.carbs,
          mix: data.mix,
          quantity: data.quantity,
          lineType: selectedLine,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast.error("Erro ao gerar cardápio. Tente novamente.");
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.flavors) {
        setFlavors(result.flavors);
        toast.success("Cardápio gerado com sucesso! 🎉");

        // Melhoria 2: Auto-scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else {
        toast.error("Resposta inesperada. Tente novamente.");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Melhoria 3: Regenerate handler
  const handleRegenerate = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit]);

  const handleAddToCart = useCallback(() => {
    if (!flavors || !selectedQuantity) return;

    const flavorSelections: FlavorSelection[] = flavors.map((f) => ({
      name: f.name,
      quantity: f.quantity,
      category: "proteina",
    }));

    const description = flavors
      .map((f) => `${f.quantity}x ${f.name}`)
      .join(", ");

    addItem({
      type: "marmita",
      name: `Cardápio Personalizado - ${lineConfig.label} ${lineConfig.weight}g`,
      quantity: selectedQuantity,
      unitPrice,
      totalPrice,
      description,
      flavors: flavorSelections,
      lineType: selectedLine,
    });

    setTimeout(() => setIsCartOpen(true), 300);
  }, [flavors, selectedQuantity, lineConfig, unitPrice, totalPrice, selectedLine, addItem]);

  const sendWhatsAppWithOrder = useCallback(async (custName: string, custPhone: string, custEmail: string) => {
    if (!flavors || !selectedQuantity) return;

    setIsCreatingWaOrder(true);
    const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    try {
      const flavorSelections: FlavorSelection[] = flavors.map((f) => ({
        name: f.name,
        quantity: f.quantity,
        category: "proteina",
      }));

      const description = flavors.map((f) => `${f.quantity}x ${f.name}`).join(", ");

      const orderItem = {
        type: "marmita",
        name: `Cardápio Personalizado - ${lineConfig.label} ${lineConfig.weight}g`,
        quantity: selectedQuantity,
        unitPrice,
        totalPrice,
        description,
        flavors: flavorSelections,
        lineType: selectedLine,
      };

      const normalizedEmail = (custEmail || `${custPhone}@whatsapp.local`).trim().toLowerCase();

      const { data: inserted, error: insertError } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenantId,
          customer_name: custName,
          customer_phone: custPhone,
          customer_email: normalizedEmail,
          status: "pending",
          payment_method: "whatsapp",
          delivery_option: "pickup",
          items: [orderItem],
          subtotal: totalPrice,
          delivery_fee: 0,
          total: totalPrice,
        })
        .select("id, order_number")
        .single();

      if (insertError) throw insertError;

      // Persist customer info locally for future flows
      try {
        localStorage.setItem("tenant_customer", JSON.stringify({ name: custName, phone: custPhone, email: normalizedEmail }));
      } catch {}

      const orderRef = inserted?.order_number || `#${inserted?.id?.slice(0, 8) ?? ""}`;

      let message = `Oi 😊\nMontei meu cardápio personalizado no site da *${brand.name}*!\n\n`;
      message += `🔖 *Pedido ${orderRef}*\n\n`;
      message += `📋 *CARDÁPIO - ${selectedQuantity} MARMITAS ${lineConfig.label} (${lineConfig.weight}g)*\n`;
      message += `_(${lineConfig.description})_\n\n`;

      flavors.forEach((f, i) => {
        message += `*${i + 1}. ${f.name}* (${f.quantity}x)\n`;
        message += `   🥩 ${f.protein}\n`;
        message += `   🍚 ${f.carb}\n`;
        message += `   🥗 ${f.mix}\n\n`;
      });

      message += `💰 *Valor: ${fmt(totalPrice)}* (${fmt(unitPrice)}/un.)\n\n`;
      message += `Pode me confirmar o pedido?`;

      window.open(
        `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`,
        "_blank"
      );

      toast.success(`Pedido ${orderRef} reservado! Envie a mensagem no WhatsApp para confirmar.`);
    } catch (err: any) {
      console.error("Erro ao criar pedido pendente:", err);
      toast.error("Não foi possível registrar o pedido. Tente novamente.");
    } finally {
      setIsCreatingWaOrder(false);
      setShowWaIdModal(false);
    }
  }, [flavors, selectedQuantity, lineConfig, unitPrice, totalPrice, selectedLine, tenantId, brand.name, contact.whatsapp]);

  const handleWhatsApp = () => {
    if (!flavors || !selectedQuantity) return;
    if (customerInfo?.name && customerInfo?.phone) {
      sendWhatsAppWithOrder(customerInfo.name, customerInfo.phone, customerInfo.email || "");
    } else {
      setShowWaIdModal(true);
    }
  };


  return (
    <>
      <Helmet>
        <title>Monte Seu Cardápio | {brand.name}</title>
        <meta name="description" content={`Monte seu cardápio personalizado de marmitas fitness com a ajuda da IA. ${brand.name}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container px-6 py-4 flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo />
          </div>
        </header>

        <main className="container px-6 py-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Montagem com IA
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Monte Seu Cardápio Personalizado
            </h1>
            <p className="text-muted-foreground mt-2">
              Informe seus ingredientes favoritos e a IA monta o cardápio ideal pra você!
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Voice input */}
            {speechSupported && (
              <div
                onClick={isRecording ? stopRecording : isParsing ? undefined : startRecording}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isRecording
                    ? "border-destructive bg-destructive/10"
                    : isParsing
                    ? "border-muted bg-muted/50 cursor-wait"
                    : "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${isRecording ? "bg-destructive/20 animate-pulse" : "bg-primary/10"}`}>
                    {isRecording ? (
                      <MicOff className="w-6 h-6 text-destructive" />
                    ) : (
                      <Mic className={`w-6 h-6 ${isParsing ? "text-muted-foreground" : "text-primary"}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      {isRecording
                        ? "🔴 Ouvindo... toque para parar"
                        : isParsing
                        ? "Processando seu áudio..."
                        : "🎙️ Prefere falar? Toque aqui!"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRecording
                        ? "Fale suas proteínas, carboidratos e legumes favoritos"
                        : isParsing
                        ? "Extraindo suas preferências com IA..."
                        : "Diga o que você gosta e preenchemos pra você"}
                    </p>
                  </div>
                  {isParsing && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                </div>
                {interimText && (
                  <div className="mt-3 p-2 bg-background rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground italic">"{interimText}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Ingredient fields with chips */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="proteins" className="text-base font-semibold flex items-center gap-2">🥩 Proteínas que você gosta</Label>
                <p className="text-xs text-muted-foreground mb-2">Ex: carne moída, strogonoff de frango, almôndegas, frango desfiado</p>
                <Textarea id="proteins" placeholder="Digite as proteínas separadas por vírgula..." {...register("proteins")} className="min-h-[80px]" />
                {errors.proteins && <p className="text-sm text-destructive mt-1">{errors.proteins.message}</p>}
                
              </div>
              <div>
                <Label htmlFor="carbs" className="text-base font-semibold flex items-center gap-2">🍚 Carboidratos que você gosta</Label>
                <p className="text-xs text-muted-foreground mb-2">Ex: aipim, arroz integral, feijão preto, batata doce</p>
                <Textarea id="carbs" placeholder="Digite os carboidratos separados por vírgula..." {...register("carbs")} className="min-h-[80px]" />
                {errors.carbs && <p className="text-sm text-destructive mt-1">{errors.carbs.message}</p>}
                
              </div>
              <div>
                <Label htmlFor="mix" className="text-base font-semibold flex items-center gap-2">🥗 Mix de legumes/salada</Label>
                <p className="text-xs text-muted-foreground mb-2">Ex: vagem, cenoura, beterraba, brócolis, abobrinha</p>
                <Textarea id="mix" placeholder="Digite os legumes/saladas separados por vírgula..." {...register("mix")} className="min-h-[80px]" />
                {errors.mix && <p className="text-sm text-destructive mt-1">{errors.mix.message}</p>}
                
              </div>
            </div>

            {/* Line type selection */}
            <div ref={lineSectionRef} className={`transition-all duration-500 rounded-xl p-1 ${highlightNextStep ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""}`}>
              <Label className="text-base font-semibold mb-3 block">🍽️ Qual linha deseja?</Label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(LINE_CONFIG) as [LineType, typeof LINE_CONFIG[LineType]][]).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedLine(key);
                      setSelectedQuantity(null);
                      setValue("quantity", undefined as any);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedLine === key
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{config.emoji}</div>
                    <div className="text-sm font-semibold text-primary">{config.objective}</div>
                    <div className="font-bold text-foreground mt-1">{config.label} <span className="text-sm font-normal text-muted-foreground">({config.weight}g)</span></div>
                    <div className="text-xs text-muted-foreground mt-1">{config.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selection with skeleton loading */}
            <div>
              <Label className="text-base font-semibold mb-3 block">📦 Quantas marmitas deseja?</Label>
              {packagesLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[120px] rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {currentPackages.map((pkg) => {
                    const total = pkg.quantity * pkg.unit_price;
                    const maxFlav = getMaxFlavors(pkg.quantity);
                    return (
                      <button
                        key={pkg.quantity}
                        type="button"
                        onClick={() => {
                          setSelectedQuantity(pkg.quantity);
                          setValue("quantity", pkg.quantity);
                        }}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          selectedQuantity === pkg.quantity
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="text-xl font-bold">{pkg.quantity}</div>
                        <div className="text-xs text-muted-foreground">até {maxFlav} sabores</div>
                        <div className="mt-2 text-sm font-semibold text-foreground">
                          R$ {pkg.unit_price.toFixed(2).replace(".", ",")}/un.
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: R$ {total.toFixed(2).replace(".", ",")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.quantity && <p className="text-sm text-destructive mt-2">{errors.quantity.message}</p>}
            </div>

            <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Gerando cardápio...</>
              ) : (
                <><UtensilsCrossed className="w-5 h-5" /> Montar meu cardápio</>
              )}
            </Button>
          </form>

          {/* Results */}
          {flavors && (
            <div ref={resultsRef} className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-center text-foreground">🎉 Seu Cardápio Personalizado</h2>
              <p className="text-center text-sm text-muted-foreground">
                Padrão {lineConfig.label}: {lineConfig.description} = {lineConfig.weight}g
              </p>

              <div className="space-y-3">
                {flavors.map((flavor, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{flavor.name}</h3>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <p>🥩 {flavor.protein} ({lineConfig.protein}g)</p>
                            <p>🍚 {flavor.carb} ({lineConfig.carb}g)</p>
                            <p>🥗 {flavor.mix} ({lineConfig.mix}g)</p>
                          </div>
                        </div>
                        <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm whitespace-nowrap">
                          {flavor.quantity}x
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Price summary */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Valor estimado do pedido</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {totalPrice.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedQuantity}x {lineConfig.label} {lineConfig.weight}g — R$ {unitPrice.toFixed(2).replace(".", ",")}/un.
                  </p>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  className="w-full h-12 text-base gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Adicionar ao Carrinho
                </Button>

                <Button
                  onClick={handleWhatsApp}
                  variant="outline"
                  className="w-full h-12 text-base gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white"
                >
                  <Send className="w-5 h-5" />
                  Enviar pelo WhatsApp
                </Button>

                {/* Melhoria 3: Regenerate button */}
                <Button
                  onClick={handleRegenerate}
                  variant="ghost"
                  className="w-full h-10 text-sm gap-2 text-muted-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Não gostei, gerar outro cardápio
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Cart components */}
        <CartFloatingButton onClick={() => setIsCartOpen(true)} />
        <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} onCheckout={() => {}} />
        <SoftIdentificationModal
          open={showIdentificationModal}
          onConfirm={(name, phone, email) => {
            setCustomerInfo({ name, phone, email, cartId: customerInfo.cartId });
            confirmAddItem();
            setTimeout(() => setIsCartOpen(true), 300);
          }}
        />
      </div>
    </>
  );
};

const MonteSeuCardapio = () => (
  <CartProvider>
    <MonteSeuCardapioContent />
  </CartProvider>
);

export default MonteSeuCardapio;
