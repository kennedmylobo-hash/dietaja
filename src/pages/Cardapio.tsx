import { useState, useMemo, useCallback, useEffect } from "react";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Dumbbell, Droplets, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { CartProvider, useCart } from "@/components/CartContext";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartDrawer from "@/components/CartDrawer";
import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";
import FlavorSelectionModal, { PricingTier } from "@/components/FlavorSelectionModal";
import KitFlavorSelectionModal from "@/components/KitFlavorSelectionModal";
import { useMarmitaPackages, useMarmitaFlavors, useKitPackages, useKitSoups, useKitJuices } from "@/hooks/useMenuData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check } from "lucide-react";
import marmita1 from "@/assets/marmita-1.png";
import marmita2 from "@/assets/marmita-2.png";
import detoxVideo from "@/assets/produtos-detox-video.mp4";
import detoxPoster from "@/assets/produtos-detox.jpg";

const lines = [
  {
    slug: "fit",
    title: "Linha FIT",
    subtitle: "Emagrecimento",
    description: "Marmitas de 300g com baixa caloria, perfeitas para quem quer secar sem passar fome.",
    price: "R$ 22,90",
    priceLabel: "a partir de",
    icon: Leaf,
    image: marmita1 as string | undefined,
    video: undefined as string | undefined,
    videoPoster: undefined as string | undefined,
    color: "from-emerald-500/20 to-emerald-600/5",
    borderColor: "border-emerald-500/30",
    iconColor: "text-emerald-600",
    tag: "🔥 Mais vendida",
    type: "marmita" as const,
    lineType: "emagrecimento",
    weight: 300,
  },
  {
    slug: "fitness",
    title: "Linha FITNESS",
    subtitle: "Hipertrofia",
    description: "Marmitas de 450g com alto teor proteico para quem treina pesado e quer resultado.",
    price: "R$ 27,90",
    priceLabel: "a partir de",
    icon: Dumbbell,
    image: marmita2 as string | undefined,
    video: undefined as string | undefined,
    videoPoster: undefined as string | undefined,
    color: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/30",
    iconColor: "text-amber-600",
    tag: "💪 +Proteína",
    type: "marmita" as const,
    lineType: "hipertrofia",
    weight: 450,
  },
  {
    slug: "detox",
    title: "Kit DETOX",
    subtitle: "Sucos & Sopas",
    description: "Programa completo com sucos funcionais e sopas nutritivas para desintoxicar o corpo.",
    price: "R$ 199,00",
    priceLabel: "a partir de (3 dias)",
    icon: Droplets,
    image: undefined as string | undefined,
    video: detoxVideo,
    videoPoster: detoxPoster,
    color: "from-primary/20 to-primary/5",
    borderColor: "border-primary/30",
    iconColor: "text-primary",
    tag: "🥤 Detox completo",
    type: "kit" as const,
    lineType: undefined,
    weight: undefined,
  },
];

const CardapioContent = () => {
  const navigate = useNavigate();
  const { brand } = useTenantConfig();
  const tenantId = useTenantId();
  const { addItem, showIdentificationModal, setShowIdentificationModal, setCustomerInfo, confirmAddItem } = useCart();

  // PageView tracking
  useEffect(() => {
    trackMetaEvent({
      eventName: 'PageView',
      eventId: generateMetaEventId('pageview'),
      tenantId,
      params: { page: '/cardapio' },
    });
  }, [tenantId]);

  const [cartOpen, setCartOpen] = useState(false);
  const [flavorModalOpen, setFlavorModalOpen] = useState(false);
  const [kitFlavorModalOpen, setKitFlavorModalOpen] = useState(false);
  const [kitPackagePickerOpen, setKitPackagePickerOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<typeof lines[0] | null>(null);
  const [selectedKitPackage, setSelectedKitPackage] = useState<any>(null);

  // Fetch data for modals
  const { data: marmitaPackages } = useMarmitaPackages();
  const { data: marmitaFlavors } = useMarmitaFlavors();
  const { data: kitPackages } = useKitPackages();
  const { data: kitSoups } = useKitSoups();
  const { data: kitJuices } = useKitJuices();

  // Sort kit packages by days
  const sortedKitPackages = useMemo(() => {
    return (kitPackages || []).sort((a, b) => a.days - b.days);
  }, [kitPackages]);

  // Get cheapest package for each line
  const getDefaultMarmitaPackage = useCallback((lineType: string) => {
    const pkgs = (marmitaPackages || []).filter(p => p.line_type === lineType).sort((a, b) => a.quantity - b.quantity);
    return pkgs[0] || null;
  }, [marmitaPackages]);

  const handleChooseFlavors = useCallback((line: typeof lines[0]) => {
    setSelectedLine(line);
    if (line.type === "kit") {
      setKitPackagePickerOpen(true);
    } else {
      setFlavorModalOpen(true);
    }
  }, []);

  const handleKitPackageSelected = useCallback((kit: any) => {
    setSelectedKitPackage(kit);
    setKitPackagePickerOpen(false);
    setKitFlavorModalOpen(true);
  }, []);

  const handleFlavorConfirm = useCallback((selections: Array<{ name: string; quantity: number; category: string }>, fishAdditional: number, totalQuantity: number, calculatedTotal: number) => {
    if (!selectedLine || !selectedLine.lineType) return;
    const pkg = getDefaultMarmitaPackage(selectedLine.lineType);
    if (!pkg) return;

    addItem({
      type: "marmita",
      name: pkg.name,
      quantity: totalQuantity,
      unitPrice: pkg.unit_price,
      totalPrice: calculatedTotal,
      flavors: selections,
      fishAdditional,
      lineType: selectedLine.lineType,
    });

    setFlavorModalOpen(false);
    setSelectedLine(null);
    setCartOpen(true);
  }, [selectedLine, getDefaultMarmitaPackage, addItem]);

  const handleKitFlavorConfirm = useCallback((
    juiceSelections: Array<{ name: string; quantity: number; category?: string }>,
    soupSelections: Array<{ name: string; quantity: number; category?: string }>
  ) => {
    if (!selectedLine || !selectedKitPackage) return;

    const allFlavors = [
      ...juiceSelections.map(j => ({ name: j.name, quantity: j.quantity, category: "sucos" })),
      ...soupSelections.map(s => ({ name: s.name, quantity: s.quantity, category: "sopas" })),
    ];

    addItem({
      type: "kit",
      name: selectedKitPackage.name,
      quantity: 1,
      unitPrice: selectedKitPackage.price,
      totalPrice: selectedKitPackage.price,
      flavors: allFlavors,
    });

    setKitFlavorModalOpen(false);
    setSelectedLine(null);
    setSelectedKitPackage(null);
    setCartOpen(true);
  }, [selectedLine, selectedKitPackage, addItem]);

  // Prepare flavor data
  const flavorsByCategory = useMemo(() => {
    if (!marmitaFlavors) return undefined;
    const grouped = {
      carnes: marmitaFlavors.filter(f => f.category === "carnes"),
      frangos: marmitaFlavors.filter(f => f.category === "frangos"),
      massas: marmitaFlavors.filter(f => f.category === "massas"),
      especiais: marmitaFlavors.filter(f => f.category === "especiais"),
    };
    return [
      { id: "carnes", name: "Carnes", flavors: grouped.carnes.map(f => f.name) },
      { id: "frangos", name: "Frangos", flavors: grouped.frangos.map(f => f.name) },
      { id: "massas", name: "Massas", flavors: grouped.massas.map(f => f.name) },
      { id: "especiais", name: "Especiais", flavors: grouped.especiais.map(f => f.name) },
    ];
  }, [marmitaFlavors]);

  const flavorStockData = useMemo(() => {
    if (!marmitaFlavors) return undefined;
    return marmitaFlavors.map(f => ({
      name: f.name,
      stock_quantity: f.stock_quantity,
      show_stock: f.show_stock,
      low_stock_threshold: f.low_stock_threshold,
      sides: f.sides,
      price_override_fit: f.price_override_fit,
      price_override_fitness: f.price_override_fitness,
    }));
  }, [marmitaFlavors]);

  // Build pricing tiers per line type for progressive discount
  const pricingTiersForLine = useMemo(() => {
    return (lineType: string): PricingTier[] => {
      if (!marmitaPackages) return [];
      return marmitaPackages
        .filter(p => p.line_type === lineType)
        .map(p => ({ minQuantity: p.quantity, unitPrice: p.unit_price }));
    };
  }, [marmitaPackages]);

  const juiceData = useMemo(() => {
    if (!kitJuices) return [];
    return kitJuices.map(j => ({ name: j.name, emoji: j.emoji, stock_quantity: j.stock_quantity, show_stock: j.show_stock, low_stock_threshold: j.low_stock_threshold, description: "" }));
  }, [kitJuices]);

  const soupData = useMemo(() => {
    if (!kitSoups) return [];
    return kitSoups.map(s => ({ name: s.name, emoji: s.emoji, stock_quantity: s.stock_quantity, show_stock: s.show_stock, low_stock_threshold: s.low_stock_threshold, description: "" }));
  }, [kitSoups]);

  const selectedPkg = selectedLine?.lineType ? getDefaultMarmitaPackage(selectedLine.lineType) : null;

  return (
    <>
      <Helmet>
        <title>Cardápio Completo | {brand.name}</title>
        <meta name="description" content="Escolha sua linha de alimentação saudável: Fit para emagrecimento, Fitness para hipertrofia ou Kit Detox para desintoxicação." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container px-6 py-4 flex items-center justify-between">
            <Logo />
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>← Voltar</Button>
          </div>
        </header>

        <section className="py-8 md:py-20">
          <div className="container px-4 md:px-6">
            <motion.div
              className="max-w-2xl mx-auto text-center mb-8 md:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                Escolha sua linha de{" "}
                <span className="text-primary">alimentação saudável</span>
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Cada linha foi pensada para um objetivo diferente. Qual é o seu?
              </p>
            </motion.div>

            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:pb-0 md:grid md:grid-cols-3 md:overflow-visible max-w-5xl mx-auto scrollbar-hide">
              {lines.map((line, i) => {
                const Icon = line.icon;
                return (
                  <motion.div
                    key={line.slug}
                    className={`group relative flex flex-col rounded-2xl border ${line.borderColor} bg-gradient-to-b ${line.color} p-4 sm:p-6 text-left transition-all hover:shadow-lg min-w-[80vw] snap-center md:min-w-0`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <span className="absolute top-4 right-4 text-xs font-medium bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border/50">
                      {line.tag}
                    </span>

                    <div className="w-full aspect-[16/9] sm:aspect-[4/3] rounded-xl overflow-hidden mb-4 sm:mb-5 bg-muted/30">
                      {line.video ? (
                        <video
                          src={line.video}
                          poster={line.videoPoster}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={line.image}
                          alt={line.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${line.iconColor}`} />
                      <h2 className="text-xl font-bold text-foreground">{line.title}</h2>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{line.subtitle}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4 flex-1">
                      {line.description}
                    </p>

                    <div className="mb-3 sm:mb-4">
                      <span className="text-xs text-muted-foreground">{line.priceLabel}</span>
                      <p className="text-2xl font-bold text-foreground">{line.price}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleChooseFlavors(line)}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Escolher sabores
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full gap-1 text-muted-foreground"
                        onClick={() => navigate(`/${line.slug}`)}
                      >
                        Saiba mais <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <CartFloatingButton onClick={() => setCartOpen(true)} />

        <footer className="py-8 border-t border-border">
          <div className="container px-6 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {brand.name}. Todas as refeições são congeladas e prontas em 3 minutos.
            </p>
          </div>
        </footer>
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} onCheckout={() => {}} />

      <SoftIdentificationModal
        open={showIdentificationModal}
        onConfirm={(name, phone, email) => {
          setCustomerInfo({ name, phone, email, cartId: null });
          confirmAddItem();
        }}
      />

      {/* Marmita Flavor Modal */}
      <FlavorSelectionModal
        isOpen={flavorModalOpen}
        onClose={() => { setFlavorModalOpen(false); setSelectedLine(null); }}
        onConfirm={handleFlavorConfirm}
        packageName={selectedPkg?.name || ""}
        packageQuantity={selectedPkg?.quantity || 7}
        packageUnitPrice={selectedPkg?.unit_price || 0}
        packageWeight={selectedLine?.weight || 300}
        flavorsByCategory={flavorsByCategory}
        flavorStockData={flavorStockData}
        lineType={selectedLine?.lineType}
        pricingTiers={selectedLine?.lineType ? pricingTiersForLine(selectedLine.lineType) : []}
      />

      {/* Kit Package Picker Dialog */}
      <Dialog open={kitPackagePickerOpen} onOpenChange={(open) => { if (!open) { setKitPackagePickerOpen(false); setSelectedLine(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha a duração do seu Kit Detox</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {sortedKitPackages.map((kit) => (
              <button
                key={kit.id}
                onClick={() => handleKitPackageSelected(kit)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div>
                  <p className="font-semibold text-foreground">{kit.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {kit.days * 4} sucos • {kit.days * 2} sopas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    R$ {kit.price.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    = R$ {(kit.price / kit.days).toFixed(2).replace('.', ',')}/dia
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Kit Flavor Modal */}
      <KitFlavorSelectionModal
        isOpen={kitFlavorModalOpen}
        onClose={() => { setKitFlavorModalOpen(false); setSelectedLine(null); setSelectedKitPackage(null); }}
        onConfirm={handleKitFlavorConfirm}
        kitName={selectedKitPackage?.name || ""}
        juiceQuantity={(selectedKitPackage?.days || 3) * 4}
        soupQuantity={(selectedKitPackage?.days || 3) * 2}
        juiceFlavorsData={juiceData}
        soupFlavorsData={soupData}
      />
    </>
  );
};

const Cardapio = () => (
  <CartProvider>
    <CardapioContent />
  </CartProvider>
);

export default Cardapio;
