import { useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Dumbbell, Flame, ShieldCheck, Clock } from "lucide-react";
import marmitaImage from "@/assets/marmita-2.png";
import { CartProvider, useCart } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartFloatingButton from "@/components/CartFloatingButton";
import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";
import FlavorSelectionModal from "@/components/FlavorSelectionModal";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import BenefitsSection from "@/components/landing/BenefitsSection";
import PackageCards, { PackageOption } from "@/components/landing/PackageCards";
import FlavorMenu from "@/components/landing/FlavorMenu";
import HowItWorks from "@/components/landing/HowItWorks";
import FloatingCTA from "@/components/landing/FloatingCTA";
import { useMarmitaHipertrofia, useGroupedMarmitaFlavors, useMarmitaFlavors } from "@/hooks/useMenuData";
import { FlavorSelection } from "@/components/CartContext";

const FitnessContent = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [flavorModalOpen, setFlavorModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);

  const { data: marmitaPackages = [] } = useMarmitaHipertrofia();
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
    description: `${pkg.quantity} marmitas de 450g`,
  }));

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
    setSelectedPackage(pkg);
    setTimeout(() => {
      setFlavorModalOpen(true);
      setLoadingId(null);
    }, 300);
  };

  const handleFlavorConfirm = (flavors: FlavorSelection[], fishAdditional: number) => {
    if (!selectedPackage) return;

    const pkg = marmitaPackages.find(p => p.id === selectedPackage.id);
    if (!pkg) return;

    addItem({
      type: "marmita",
      name: pkg.name,
      quantity: pkg.quantity,
      unitPrice: pkg.unit_price,
      totalPrice: pkg.quantity * pkg.unit_price,
      description: `${pkg.quantity}x Marmita 450g`,
      flavors,
      fishAdditional,
    });

    setFlavorModalOpen(false);
    setSelectedPackage(null);
    setIsCartOpen(true);
  };

  const benefits = [
    {
      icon: Dumbbell,
      title: "150g de proteína",
      description: "Porção generosa de proteína para suporte ao ganho de massa muscular",
    },
    {
      icon: Flame,
      title: "Alto valor calórico",
      description: "Calorias de qualidade para sustentar treinos intensos",
    },
    {
      icon: Clock,
      title: "Praticidade pós-treino",
      description: "Refeição completa pronta em minutos, ideal para a janela anabólica",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Helmet>
        <title>Marmitas Fitness 450g | Dieta Já - Hipertrofia</title>
        <meta name="description" content="Marmitas de 450g para quem treina pesado. 150g de proteína, alto valor calórico e praticidade para ganho de massa." />
      </Helmet>

      <LandingHeader />

      <LandingHero
        category="fitness"
        title="Combustível para quem treina pesado"
        subtitle="Marmitas de 450g com porção generosa de proteína para suporte ao ganho de massa muscular"
        benefits={[
          "150g proteína + 200g carbo + 100g vegetal",
          "Suporte para ganho de massa",
          "Mesmos sabores, porção maior",
        ]}
        badgeText="Linha Hipertrofia"
        badgeEmoji="💪"
        accentColor="terracotta"
        imageUrl={marmitaImage}
        onScrollToMenu={scrollToMenu}
      />

      <BenefitsSection
        title="Por que escolher a linha Fitness?"
        subtitle="Alimentação de atleta para resultados de atleta"
        benefits={benefits}
        accentColor="terracotta"
      />

      <div ref={menuRef}>
        <FlavorMenu
          title="🍽️ Nosso Cardápio"
          subtitle="Os mesmos sabores deliciosos, em porção maior"
          categories={flavorsByCategory}
        />
      </div>

      <div ref={packagesRef}>
        <PackageCards
          title="Escolha seu Pacote"
          subtitle="Quanto maior o pacote, menor o preço por unidade"
          packages={packages}
          onSelect={handlePackageSelect}
          accentColor="terracotta"
          loadingId={loadingId}
          unit="un"
        />
      </div>

      <HowItWorks accentColor="terracotta" />

      {/* Guarantee Section */}
      <section className="py-12 bg-terracotta/5">
        <div className="container mx-auto px-4 text-center">
          <ShieldCheck className="w-12 h-12 text-terracotta mx-auto mb-4" />
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
        packageWeight={450}
        flavorsByCategory={flavorsByCategory}
        flavorStockData={flavorStockData}
      />
    </div>
  );
};

const Fitness = () => (
  <CartProvider>
    <FitnessContent />
  </CartProvider>
);

export default Fitness;
