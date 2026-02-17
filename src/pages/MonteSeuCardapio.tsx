import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, Send, UtensilsCrossed, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTenantConfig } from "@/hooks/useTenantConfig";

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

const MonteSeuCardapio = () => {
  const { brand, contact } = useTenantConfig();
  const [loading, setLoading] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[] | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const quantities = [
    { value: 10, label: "10 marmitas", flavors: "até 3 sabores" },
    { value: 20, label: "20 marmitas", flavors: "até 5 sabores" },
    { value: 30, label: "30 marmitas", flavors: "até 10 sabores" },
  ];

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

  const handleWhatsApp = () => {
    if (!flavors || !selectedQuantity) return;

    let message = `Oi 😊\nMontei meu cardápio personalizado no site da *${brand.name}*!\n\n`;
    message += `📋 *CARDÁPIO - ${selectedQuantity} MARMITAS (Padrão Fit 300g)*\n`;
    message += `_(100g proteína + 150g carboidrato + 50g mix)_\n\n`;

    flavors.forEach((f, i) => {
      message += `*${i + 1}. ${f.name}* (${f.quantity}x)\n`;
      message += `   🥩 ${f.protein}\n`;
      message += `   🍚 ${f.carb}\n`;
      message += `   🥗 ${f.mix}\n\n`;
    });

    message += `Pode me confirmar o pedido?`;

    window.open(
      `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <>
      <Helmet>
        <title>Monte Seu Cardápio | {brand.name}</title>
        <meta name="description" content={`Monte seu cardápio personalizado de marmitas fitness com a ajuda da IA. ${brand.name}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container px-6 py-4 flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo />
          </div>
        </header>

        <main className="container px-6 py-8 max-w-2xl mx-auto">
          {/* Title */}
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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="proteins" className="text-base font-semibold flex items-center gap-2">
                  🥩 Proteínas que você gosta
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ex: carne moída, strogonoff de frango, almôndegas, frango desfiado
                </p>
                <Textarea
                  id="proteins"
                  placeholder="Digite as proteínas separadas por vírgula..."
                  {...register("proteins")}
                  className="min-h-[80px]"
                />
                {errors.proteins && (
                  <p className="text-sm text-destructive mt-1">{errors.proteins.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="carbs" className="text-base font-semibold flex items-center gap-2">
                  🍚 Carboidratos que você gosta
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ex: aipim, arroz integral, feijão preto, batata doce
                </p>
                <Textarea
                  id="carbs"
                  placeholder="Digite os carboidratos separados por vírgula..."
                  {...register("carbs")}
                  className="min-h-[80px]"
                />
                {errors.carbs && (
                  <p className="text-sm text-destructive mt-1">{errors.carbs.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="mix" className="text-base font-semibold flex items-center gap-2">
                  🥗 Mix de legumes/salada
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ex: vagem, cenoura, beterraba, brócolis, abobrinha
                </p>
                <Textarea
                  id="mix"
                  placeholder="Digite os legumes/saladas separados por vírgula..."
                  {...register("mix")}
                  className="min-h-[80px]"
                />
                {errors.mix && (
                  <p className="text-sm text-destructive mt-1">{errors.mix.message}</p>
                )}
              </div>
            </div>

            {/* Quantity Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                📦 Quantas marmitas deseja?
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {quantities.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => {
                      setSelectedQuantity(q.value);
                      setValue("quantity", q.value);
                    }}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      selectedQuantity === q.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="text-xl font-bold">{q.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{q.flavors}</div>
                  </button>
                ))}
              </div>
              {errors.quantity && (
                <p className="text-sm text-destructive mt-2">{errors.quantity.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando cardápio...
                </>
              ) : (
                <>
                  <UtensilsCrossed className="w-5 h-5" />
                  Montar meu cardápio
                </>
              )}
            </Button>
          </form>

          {/* Results */}
          {flavors && (
            <div className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-center text-foreground">
                🎉 Seu Cardápio Personalizado
              </h2>
              <p className="text-center text-sm text-muted-foreground">
                Padrão Fit: 100g proteína + 150g carboidrato + 50g mix = 300g
              </p>

              <div className="space-y-3">
                {flavors.map((flavor, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{flavor.name}</h3>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <p>🥩 {flavor.protein} (100g)</p>
                            <p>🍚 {flavor.carb} (150g)</p>
                            <p>🥗 {flavor.mix} (50g)</p>
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

              <Button
                onClick={handleWhatsApp}
                className="w-full h-12 text-base gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white"
              >
                <Send className="w-5 h-5" />
                Enviar pedido pelo WhatsApp
              </Button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default MonteSeuCardapio;
