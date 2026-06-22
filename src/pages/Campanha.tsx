import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/CartContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, Star, Truck, Clock, Check, Copy, Phone, Plus } from "lucide-react";

interface Flavor { id: string; name: string; category: string; calories?: number; protein_g?: number; image_url?: string; price_override_fit?: number; featured?: boolean; }
interface Package { id: string; name: string; line_type: string; quantity: number; unit_price: number; }

export default function CampanhaPage() {
  const [searchParams] = useSearchParams();
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, itemCount } = useCart();

  const campaign = searchParams.get("utm_campaign") || "parceiros";
  const influencer = searchParams.get("utm_source") || "blogueira";
  const couponCode = searchParams.get("coupon") || (campaign === "blogueira-ana" ? "ANA10" : campaign === "blogueira-julia" ? "JULIA15" : "BEMVINDO10");
  const discount = couponCode.includes("15") ? "15%" : couponCode.includes("10") || couponCode.includes("BEM") ? "10%" : "10%";

  useEffect(() => {
    Promise.all([
      supabase.from("marmita_flavors").select("*").eq("active", true).order("sort_order"),
      supabase.from("marmita_packages").select("*").eq("active", true).order("sort_order"),
    ]).then(([f, p]) => {
      if (f.data) setFlavors(f.data as Flavor[]);
      if (p.data) setPackages(p.data as Package[]);
      setLoading(false);
    });
  }, []);

  const handleAdd = (flavor: Flavor) => {
    const cheapest = packages.filter(p => p.line_type === "emagrecimento").sort((a, b) => a.unit_price - b.unit_price)[0];
    const price = flavor.price_override_fit || cheapest?.unit_price || 19.90;
    addItem({ type: "marmita", name: flavor.name, quantity: 1, unitPrice: price, totalPrice: price, lineType: "emagrecimento" } as any, true);
    toast(`${flavor.name} adicionado! Cupom ${couponCode} aplicado no carrinho`, { duration: 2000 });
  };

  const copyCoupon = () => {
    navigator.clipboard.writeText(couponCode);
    toast("Cupom copiado! ✅");
  };

  const featured = flavors.filter(f => f.featured).slice(0, 6);
  const displayFlavors = featured.length > 0 ? featured : flavors.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Helmet>
        <title>{campaign === "blogueira-ana" ? "Dieta Já | Oferta especial Ana Carolina" : campaign === "blogueira-julia" ? "Dieta Já | Oferta especial Júlia Mendes" : "Dieta Já | Oferta especial"} — {discount} OFF</title>
        <meta name="description" content={`${discount} de desconto nas marmitas saudáveis! Cupom ${couponCode}. Monte seu cardápio e receba em casa. Frete grátis acima de R$ 290.`} />
        <meta property="og:title" content={`Dieta Já | ${discount} OFF - Oferta especial`} />
        <meta property="og:description" content={`Use o cupom ${couponCode} e ganhe ${discount} de desconto. Marmitas saudáveis em Vitória da Conquista!`} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      {/* Hero da Campanha */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-emerald-400">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="bg-white/20 text-white border-white/30 mb-4 text-sm px-4 py-1">
              🎁 Oferta especial {influencer}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Marmitas saudáveis com <span className="text-yellow-300">{discount} OFF</span>
            </h1>
            <p className="text-lg text-white/90 mb-6 max-w-xl mx-auto">
              Use o cupom exclusivo e experimente a praticidade de comer bem sem perder tempo.
            </p>
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="bg-white/15 backdrop-blur rounded-xl px-6 py-3 border border-white/20">
                <span className="text-white/60 text-sm">Cupom</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tracking-wider">{couponCode}</span>
                  <button onClick={copyCoupon} className="text-yellow-300 hover:text-yellow-200 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80">
              <span className="flex items-center gap-1">🚚 Frete grátis acima de R$ 290</span>
              <span className="flex items-center gap-1">📦 Pedido mínimo 7 unidades</span>
              <span className="flex items-center gap-1">💳 PIX e Cartão</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Produtos */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Mais pedidos da semana 🔥</h2>
          <p className="text-muted-foreground">Escolha seus sabores e use o cupom {couponCode} no carrinho</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {displayFlavors.map((flavor, i) => (
              <motion.div key={flavor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleAdd(flavor)}>
                  <CardContent className="p-3">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center text-4xl mb-2">
                      {flavor.image_url ? (
                        <img src={flavor.image_url} alt={flavor.name} className="w-full h-full object-cover rounded-lg" loading="lazy" />
                      ) : (
                        ["🥩","🐔","🍝","⭐","🐟","🥬","🍜"][["carnes","frangos","massas","especiais","peixes","vegetariano","sopas"].indexOf(flavor.category) % 7] || "🍽️"
                      )}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{flavor.name}</h3>
                    {flavor.calories && <p className="text-[10px] text-muted-foreground">🔥 ~{flavor.calories}kcal</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-green-600 font-bold text-sm">R$ {(flavor.price_override_fit || 19.90).toFixed(2).replace(".", ",")}</span>
                      <Button size="sm" className="h-7 w-7 p-0 rounded-full bg-green-600 hover:bg-green-700">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 gap-2 text-base" onClick={() => window.location.href = "/site#produtos"}>
            Ver cardápio completo <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Como usar o cupom */}
      <div className="bg-green-50 border-y">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-6">Como usar seu cupom {couponCode}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { step: "1", icon: "🛒", title: "Adicione os sabores", text: "Clique nos sabores que mais gostou acima" },
              { step: "2", icon: "💳", title: "Vá para o carrinho", text: "Clique no ícone do carrinho e cole o cupom" },
              { step: "3", icon: "🎉", title: "Pague com {discount} OFF", text: `O desconto é aplicado automaticamente!` },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="font-semibold mt-2 mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer simples */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="font-bold text-white mb-2">Dieta Já</p>
          <p>Vitória da Conquista - BA</p>
          <p className="mt-2">Oferta válida por tempo limitado. Cupom {couponCode} — {discount} de desconto.</p>
        </div>
      </footer>
    </div>
  );
}
