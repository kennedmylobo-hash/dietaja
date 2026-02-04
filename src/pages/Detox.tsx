import { useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Droplets, Zap, Scale, ShieldCheck } from "lucide-react";
import detoxVideo from "@/assets/produtos-detox-video.mp4";
import { CartProvider, useCart } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartFloatingButton from "@/components/CartFloatingButton";
import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";
import KitFlavorSelectionModal from "@/components/KitFlavorSelectionModal";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import BenefitsSection from "@/components/landing/BenefitsSection";
import PackageCards, { PackageOption } from "@/components/landing/PackageCards";
import DetoxFlavorMenu from "@/components/landing/DetoxFlavorMenu";
import HowItWorks from "@/components/landing/HowItWorks";
import FloatingCTA from "@/components/landing/FloatingCTA";
import { useKitPackages, useKitSoups, useKitJuices } from "@/hooks/useMenuData";
import { FlavorSelection } from "@/components/CartContext";

const DetoxContent = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [flavorModalOpen, setFlavorModalOpen] = useState(false);
  const [selectedKit, setSelectedKit] = useState<PackageOption | null>(null);

  const { data: kitPackages = [], isLoading } = useKitPackages();
  const { data: soups = [] } = useKitSoups();
  const { data: juices = [] } = useKitJuices();
  const { addItem, showIdentificationModal, setShowIdentificationModal, confirmAddItem, setCustomerInfo } = useCart();

  // Transform kit packages for PackageCards
  const packages: PackageOption[] = kitPackages.map(kit => ({
    id: kit.id,
    name: kit.name,
    price: kit.price,
    quantity: kit.days,
    pricePerUnit: kit.price / kit.days,
    popular: kit.popular,
    description: kit.description || `${kit.days} dias de detox`,
  }));

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
    setSelectedKit(pkg);
    setTimeout(() => {
      setFlavorModalOpen(true);
      setLoadingId(null);
    }, 300);
  };

  const handleFlavorConfirm = (juiceFlavors: FlavorSelection[], soupFlavors: FlavorSelection[]) => {
    if (!selectedKit) return;

    const kit = kitPackages.find(k => k.id === selectedKit.id);
    if (!kit) return;

    addItem({
      type: "kit",
      name: kit.name,
      quantity: 1,
      unitPrice: kit.price,
      totalPrice: kit.price,
      description: `Kit ${kit.days} dias`,
      flavors: [...juiceFlavors, ...soupFlavors],
    });

    setFlavorModalOpen(false);
    setSelectedKit(null);
    setIsCartOpen(true);
  };

  // Calculate juice and soup quantities per kit
  const getKitQuantities = (days: number) => {
    // 3 days = 6 juices + 3 soups, 5 days = 10 juices + 5 soups, 7 days = 14 juices + 7 soups
    return {
      juices: days * 2,
      soups: days,
    };
  };

  const kitQuantities = selectedKit ? getKitQuantities(selectedKit.quantity) : { juices: 0, soups: 0 };

  const benefits = [
    {
      icon: Droplets,
      title: "Elimina toxinas",
      description: "Ingredientes naturais que ajudam a limpar seu organismo de substâncias prejudiciais",
    },
    {
      icon: Scale,
      title: "Reduz inchaço",
      description: "Formulação anti-inflamatória que combate a retenção de líquidos",
    },
    {
      icon: Zap,
      title: "Aumenta energia",
      description: "Nutrientes que melhoram sua disposição ao longo do dia",
    },
  ];

  // Map soups/juices to modal format
  const juiceFlavorsData = juices.map(j => ({
    emoji: j.emoji,
    name: j.name,
    description: j.ingredients || "",
    stock_quantity: j.stock_quantity,
    show_stock: j.show_stock,
    low_stock_threshold: j.low_stock_threshold,
  }));

  const soupFlavorsData = soups.map(s => ({
    emoji: s.emoji,
    name: s.name,
    description: s.ingredients || "",
    stock_quantity: s.stock_quantity,
    show_stock: s.show_stock,
    low_stock_threshold: s.low_stock_threshold,
  }));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Helmet>
        <title>Kit Detox | Dieta Já - Sucos e Sopas Funcionais</title>
        <meta name="description" content="Desintoxique seu corpo com nossos kits de sucos e sopas funcionais. Reduza inchaço, aumente energia e renove sua disposição." />
      </Helmet>

      <LandingHeader />

      <LandingHero
        category="detox"
        title="Desintoxique seu corpo em até 7 dias"
        subtitle="Sucos e sopas funcionais para renovar sua energia e preparar seu corpo para uma nova rotina alimentar"
        benefits={[
          "Reduz inchaço e retenção de líquidos",
          "Aumenta disposição e energia",
          "Prepara o corpo para nova rotina alimentar",
        ]}
        badgeText="Detox funcional"
        badgeEmoji="🍃"
        accentColor="primary"
        videoUrl={detoxVideo}
        onScrollToMenu={scrollToMenu}
      />

      <BenefitsSection
        title="Por que fazer detox?"
        subtitle="Benefícios comprovados para seu corpo"
        benefits={benefits}
        accentColor="primary"
      />

      <div ref={menuRef}>
        <DetoxFlavorMenu />
      </div>

      <div ref={packagesRef}>
        <PackageCards
          title="Escolha seu Kit Detox"
          subtitle="Quanto mais dias, maior o resultado"
          packages={packages}
          onSelect={handlePackageSelect}
          accentColor="primary"
          loadingId={loadingId}
          unit="dia"
        />
      </div>

      <HowItWorks accentColor="primary" />

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

      <KitFlavorSelectionModal
        isOpen={flavorModalOpen}
        onClose={() => {
          setFlavorModalOpen(false);
          setSelectedKit(null);
        }}
        onConfirm={handleFlavorConfirm}
        kitName={selectedKit?.name || ""}
        juiceQuantity={kitQuantities.juices}
        soupQuantity={kitQuantities.soups}
        juiceFlavorsData={juiceFlavorsData}
        soupFlavorsData={soupFlavorsData}
      />
    </div>
  );
};

const Detox = () => (
  <CartProvider>
    <DetoxContent />
  </CartProvider>
);

export default Detox;
