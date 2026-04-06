import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { generateMetaEventId, trackMetaEvent } from "@/lib/meta";
import { useTenantId } from "@/hooks/useTenantId";
import { Helmet } from "react-helmet-async";
import { Scale, Utensils, Clock, ShieldCheck } from "lucide-react";
import marmitaImage from "@/assets/marmita-1.png";
import { CartProvider, useCart } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartFloatingButton from "@/components/CartFloatingButton";
import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";
import FlavorSelectionModal, { PricingTier } from "@/components/FlavorSelectionModal";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import BenefitsSection from "@/components/landing/BenefitsSection";
import PackageCards, { PackageOption } from "@/components/landing/PackageCards";
import FlavorMenu from "@/components/landing/FlavorMenu";
import HowItWorks from "@/components/landing/HowItWorks";
import FloatingCTA from "@/components/landing/FloatingCTA";
import TestimonialsSection from "@/components/TestimonialsSection";
import UrgencySection from "@/components/UrgencySection";
import FitFAQSection from "@/components/FitFAQSection";
import { useMarmitaEmagrecimento, useGroupedMarmitaFlavors, useMarmitaFlavors } from "@/hooks/useMenuData";
import { FlavorSelection } from "@/components/CartContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";

const FitContent = () => {
  const { brand, urls, location } = useTenantConfig();
  const menuRef = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [flavorModalOpen, setFlavorModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);

  const { data: marmitaPackages = [] } = useMarmitaEmagrecimento();
  const { grouped } = useGroupedMarmitaFlavors();
  const { data: flavorsRaw = [] } = useMarmitaFlavors();
  const { addItem, showIdentificationModal, setShowIdentificationModal, confirmAddItem, setCustomerInfo } = useCart();

  // Transform packages for PackageCards
  const packages: PackageOption[] = marmitaPackages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    price: pkg.quantity * pkg.unit_price,
    quantity: pkg.quantity,
    pricePerUnit: pkg.unit_price,
    popular: pkg.popular,
    description: `${pkg.quantity} marmitas de 300g`,
  }));

  const tenantId = useTenantId();
  useEffect(() => {
    if (packages.length > 0) {
      const avgPrice = packages.reduce((sum, p) => sum + p.price, 0) / packages.length;
      trackMetaEvent({
        eventName: 'ViewContent',
        eventId: generateMetaEventId('view'),
        params: { content_type: 'product_group', content_name: 'Marmita Fit 300g', content_category: 'Emagrecimento', value: avgPrice, currency: 'BRL' },
        tenantId,
      });
    }
  }, [packages.length]);

  // Transform flavors for modal
  const flavorsByCategory = [
    { id: "carnes", name: "Carnes", flavors: grouped.carnes },
    { id: "frangos", name: "Frangos", flavors: grouped.frangos },
    { id: "massas", name: "Massas", flavors: grouped.massas },
    { id: "especiais", name: "Especiais", flavors: grouped.especiais },
  ].filter(cat => cat.flavors.length > 0);

  // Stock data for modal
  const flavorStockData = flavorsRaw.map(f => ({
    name: f.name,
    stock_quantity: f.stock_quantity,
    show_stock: f.show_stock,
    low_stock_threshold: f.low_stock_threshold,
    sides: f.sides,
    price_override_fit: f.price_override_fit,
    price_override_fitness: f.price_override_fitness,
  }));

  // Compute minimum flavor override for fit line
  const minFlavorUnitPrice = (() => {
    const overrides = flavorsRaw.map(f => f.price_override_fit).filter((v): v is number => v != null && v > 0);
    return overrides.length > 0 ? Math.min(...overrides) : undefined;
  })();

  // Build pricing tiers from packages for progressive discount nudge/celebration
  const pricingTiers: PricingTier[] = useMemo(() => {
    return marmitaPackages.map(pkg => ({
      minQuantity: pkg.quantity,
      unitPrice: pkg.unit_price,
    }));
  }, [marmitaPackages]);

  const scrollToPackages = useCallback(() => {
    if (packagesRef.current) {
      packagesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const scrollToMenu = useCallback(() => {
    if (menuRef.current) {
      menuRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handlePackageSelect = (pkg: PackageOption) => {
    setLoadingId(pkg.id);
    setSelectedPackage(pkg);
    setTimeout(() => {
      setFlavorModalOpen(true);
      setLoadingId(null);
    }, 300);
  };

  const handleFlavorConfirm = (flavors: FlavorSelection[], fishAdditional: number, totalQuantity: number, calculatedTotal: number) => {
    if (!selectedPackage) return;
    const pkg = marmitaPackages.find(p => p.id === selectedPackage.id);
    if (!pkg) return;

    addItem({
      type: "marmita",
      name: pkg.name,
      quantity: totalQuantity,
      unitPrice: pkg.unit_price,
      totalPrice: calculatedTotal,
      description: `${totalQuantity}x Marmita 300g`,
      flavors,
      fishAdditional,
      lineType: 'emagrecimento',
    });

    setFlavorModalOpen(false);
    setSelectedPackage(null);
    setIsCartOpen(true);
  };

  const benefits = [
    {
      icon: Scale,
      title: "Porções controladas",
      description: "300g perfeitamente balanceados para déficit calórico saudável",
    },
    {
      icon: Utensils,
      title: "+30 sabores",
      description: "Variedade para não enjoar e manter a dieta por mais tempo",
    },
    {
      icon: Clock,
      title: "Praticidade total",
      description: "Refeições prontas em minutos, sem preparação ou desperdício",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Helmet>
        <title>Marmitas Fit 300g | {brand.name} - Emagrecimento</title>
        <meta name="description" content="Marmitas de 300g balanceadas para emagrecimento. Porções controladas, +30 sabores e praticidade para sua dieta." />
        <meta name="keywords" content="marmita fit, emagrecimento, dieta, marmita 300g, alimentação saudável" />
        <link rel="canonical" href={`${urls.canonical}/fit`} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content="Marmitas Fit 300g - Emagreça com Sabor" />
        <meta property="og:description" content={`Porções controladas de 300g com +30 sabores. Praticidade para sua dieta em ${location.city}.`} />
        <meta property="og:url" content={`${urls.canonical}/fit`} />
        <meta property="og:image" content={urls.ogImage} />
        <meta property="og:site_name" content={brand.name} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <LandingHeader />

      <LandingHero
        category="fit"
        title="Emagreça sem abrir mão do sabor"
        subtitle="Marmitas de 300g perfeitamente balanceadas para quem quer emagrecer com praticidade e variedade"
        benefits={[
          "Porções controladas para emagrecimento",
          "+30 sabores para não enjoar",
          "Praticidade de refeição pronta",
        ]}
        badgeText="Linha Emagrecimento"
        badgeEmoji="🥗"
        accentColor="primary"
        imageUrl={marmitaImage}
        onScrollToMenu={scrollToPackages}
      />

      <BenefitsSection
        title="Por que escolher a linha Fit?"
        subtitle="Tudo que você precisa para emagrecer de verdade"
        benefits={benefits}
        accentColor="primary"
      />

      <TestimonialsSection />

      <div ref={menuRef}>
        <FlavorMenu
          title="🍽️ Nosso Cardápio"
          subtitle="Escolha entre dezenas de opções deliciosas"
          categories={flavorsByCategory}
        />
      </div>

      <div ref={packagesRef}>
        <PackageCards
          title="Escolha seu Pacote"
          subtitle="Quanto maior o pacote, menor o preço por unidade"
          packages={packages}
          onSelect={handlePackageSelect}
          accentColor="primary"
          loadingId={loadingId}
          unit="un"
          minFlavorUnitPrice={minFlavorUnitPrice}
        />
      </div>

      <UrgencySection />

      <HowItWorks accentColor="primary" />

      <FitFAQSection />

      {/* Guarantee Section */}
      <section className="py-12 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Garantia de satisfação
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Se você não gostar, devolvemos seu dinheiro. Sem perguntas.
          </p>
        </div>
      </section>

      <FloatingCTA 
        onScrollToPackages={() => setIsCartOpen(true)}
        showScrollUp
      />

      <CartFloatingButton onClick={() => setIsCartOpen(true)} />
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} onCheckout={() => {}} />

      <SoftIdentificationModal
        open={showIdentificationModal}
        onConfirm={(name, phone, email) => {
          setCustomerInfo({ name, phone, email, cartId: null });
          confirmAddItem();
        }}
      />

      <FlavorSelectionModal
        isOpen={flavorModalOpen}
        onClose={() => {
          setFlavorModalOpen(false);
          setSelectedPackage(null);
        }}
        onConfirm={handleFlavorConfirm}
        packageName={selectedPackage?.name || ""}
        packageQuantity={selectedPackage?.quantity || 0}
        packageUnitPrice={selectedPackage ? (marmitaPackages.find(p => p.id === selectedPackage.id)?.unit_price || 0) : 0}
        packageWeight={300}
        lineType="emagrecimento"
        flavorsByCategory={flavorsByCategory}
        flavorStockData={flavorStockData}
        pricingTiers={pricingTiers}
      />
    </div>
  );
};

const Fit = () => (
  <CartProvider>
    <FitContent />
  </CartProvider>
);

export default Fit;
