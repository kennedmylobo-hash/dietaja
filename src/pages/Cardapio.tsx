import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { CartProvider, useCart } from "@/components/CartContext";
import { useMarmitaPackages, useMarmitaFlavors, useKitPackages, useKitSoups, useKitJuices } from "@/hooks/useMenuData";
import { useActiveSection } from "@/hooks/useActiveSection";
import CardapioHeader from "@/components/cardapio/CardapioHeader";
import CardapioSidebar from "@/components/cardapio/CardapioSidebar";
import CategorySection from "@/components/cardapio/CategorySection";
import MobileNav from "@/components/cardapio/MobileNav";
import CardapioBanner from "@/components/cardapio/CardapioBanner";
import HeroBanners from "@/components/cardapio/HeroBanners";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartDrawer from "@/components/CartDrawer";
import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";
import FlavorSelectionModal from "@/components/FlavorSelectionModal";
import KitFlavorSelectionModal from "@/components/KitFlavorSelectionModal";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantConfig } from "@/hooks/useTenantConfig";

interface PendingProduct {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  type: "kit" | "marmita";
  days?: number;
  lineType?: string;
  weight?: number;
}

const CardapioContent = () => {
  const tenantConfig = useTenantConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("kits");
  const [cartOpen, setCartOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<PendingProduct | null>(null);
  const [flavorModalOpen, setFlavorModalOpen] = useState(false);
  const [kitFlavorModalOpen, setKitFlavorModalOpen] = useState(false);

  const { 
    addItem, 
    items,
    itemCount
  } = useCart();

  const { trackPageView, trackCTAClick } = useAnalytics();

  // Refs for sections
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Fetch data
  const { data: marmitaPackages, isLoading: loadingMarmitas } = useMarmitaPackages();
  const { data: marmitaFlavors } = useMarmitaFlavors();
  const { data: kitPackages, isLoading: loadingKits } = useKitPackages();
  const { data: kitSoups } = useKitSoups();
  const { data: kitJuices } = useKitJuices();

  const isLoading = loadingMarmitas || loadingKits;

  // Track page view
  useEffect(() => {
    trackPageView("/cardapio");
  }, []);

  // Transform data to products
  const products = useMemo(() => {
    const kits = (kitPackages || [])
      .slice(0, 3) // Limita para 3 kits
      .map((kit) => ({
        id: kit.id,
        name: kit.name,
        description: kit.description || `${kit.days} dias de detox`,
        price: kit.price,
        quantity: kit.days,
        imageUrl: null,
        popular: kit.popular,
        type: "kit" as const,
        category: "kits",
        days: kit.days,
      }));

    const marmitas = (marmitaPackages || []).map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      description: `Pacote com ${pkg.quantity} marmitas saudáveis`,
      price: pkg.unit_price,
      quantity: pkg.quantity,
      imageUrl: pkg.image_url,
      popular: pkg.popular,
      type: "marmita" as const,
      category: "marmitas",
      lineType: pkg.line_type,
      weight: pkg.weight,
    }));

    return { kits, marmitas };
  }, [kitPackages, marmitaPackages]);

  // Group marmitas by line type (fit / fitness)
  const marmitaLineGroups = useMemo(() => {
    const fit = products.marmitas.filter(m => m.lineType === 'emagrecimento');
    const fitness = products.marmitas.filter(m => m.lineType === 'hipertrofia');
    return { fit, fitness };
  }, [products.marmitas]);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return { kits: products.kits, fit: marmitaLineGroups.fit, fitness: marmitaLineGroups.fitness };
    }

    const query = searchQuery.toLowerCase();
    
    return {
      kits: products.kits.filter((p) => 
        p.name.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query)
      ),
      fit: marmitaLineGroups.fit.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      ),
      fitness: marmitaLineGroups.fitness.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      ),
    };
  }, [products, marmitaLineGroups, searchQuery]);

  // Handle category click
  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    const element = sectionRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Handle add product
  const handleAddProduct = useCallback((product: PendingProduct) => {
    trackCTAClick(`add_to_cart_${product.type}`);
    setPendingProduct(product);
    
    if (product.type === "kit") {
      setKitFlavorModalOpen(true);
    } else {
      setFlavorModalOpen(true);
    }
  }, [trackCTAClick]);

  // Handle flavor confirmation for marmitas
  const handleFlavorConfirm = useCallback((selections: Array<{ name: string; quantity: number; category: string }>, fishAdditional: number, totalQuantity: number, calculatedTotal: number) => {
    if (!pendingProduct) return;

    addItem({
      type: "marmita",
      name: pendingProduct.name,
      quantity: totalQuantity,
      unitPrice: pendingProduct.price,
      totalPrice: calculatedTotal,
      flavors: selections,
      fishAdditional: fishAdditional,
      lineType: pendingProduct.lineType,
    });

    setFlavorModalOpen(false);
    setPendingProduct(null);
  }, [pendingProduct, addItem]);

  // Handle kit flavor confirmation
  const handleKitFlavorConfirm = useCallback((
    juiceSelections: Array<{ name: string; quantity: number; category?: string }>,
    soupSelections: Array<{ name: string; quantity: number; category?: string }>
  ) => {
    if (!pendingProduct) return;

    // Format flavors for kit (combine juices and soups into flavors array)
    const allFlavors = [
      ...juiceSelections.map(j => ({ name: j.name, quantity: j.quantity, category: "sucos" })),
      ...soupSelections.map(s => ({ name: s.name, quantity: s.quantity, category: "sopas" })),
    ];

    addItem({
      type: "kit",
      name: pendingProduct.name,
      quantity: 1,
      unitPrice: pendingProduct.price,
      totalPrice: pendingProduct.price,
      flavors: allFlavors,
    });

    setKitFlavorModalOpen(false);
    setPendingProduct(null);
  }, [pendingProduct, addItem]);

  // Prepare flavor data for marmita modal
  const flavorsByCategory = useMemo(() => {
    if (!marmitaFlavors) return undefined;

    const grouped = {
      carnes: marmitaFlavors.filter((f) => f.category === "carnes"),
      frangos: marmitaFlavors.filter((f) => f.category === "frangos"),
      massas: marmitaFlavors.filter((f) => f.category === "massas"),
      especiais: marmitaFlavors.filter((f) => f.category === "especiais"),
    };

    return [
      { id: "carnes", name: "Carnes", flavors: grouped.carnes.map((f) => f.name) },
      { id: "frangos", name: "Frangos", flavors: grouped.frangos.map((f) => f.name) },
      { id: "massas", name: "Massas", flavors: grouped.massas.map((f) => f.name) },
      { id: "especiais", name: "Especiais", flavors: grouped.especiais.map((f) => f.name) },
    ];
  }, [marmitaFlavors]);

  const flavorStockData = useMemo(() => {
    if (!marmitaFlavors) return undefined;
    return marmitaFlavors.map((f) => ({
      name: f.name,
      stock_quantity: f.stock_quantity,
      show_stock: f.show_stock,
      low_stock_threshold: f.low_stock_threshold,
      sides: f.sides,
      price_override_fit: f.price_override_fit,
      price_override_fitness: f.price_override_fitness,
    }));
  }, [marmitaFlavors]);

  const juiceData = useMemo(() => {
    if (!kitJuices) return [];
    return kitJuices.map((j) => ({
      name: j.name,
      emoji: j.emoji,
      stock_quantity: j.stock_quantity,
      show_stock: j.show_stock,
      low_stock_threshold: j.low_stock_threshold,
    }));
  }, [kitJuices]);

  const soupData = useMemo(() => {
    if (!kitSoups) return [];
    return kitSoups.map((s) => ({
      name: s.name,
      emoji: s.emoji,
      stock_quantity: s.stock_quantity,
      show_stock: s.show_stock,
      low_stock_threshold: s.low_stock_threshold,
    }));
  }, [kitSoups]);

  // Fixed line-based categories (no longer from database)

  // Fixed line-based section IDs
  const lineSectionIds = ["fit", "fitness"];

  // Build section IDs for scroll spy
  const sectionIds = useMemo(() => {
    return ["kits", ...lineSectionIds];
  }, []);

  // Scroll spy - detect active section
  const scrollActiveSection = useActiveSection({ 
    sectionIds, 
    offset: 120 
  });

  // Sync scroll-detected section with activeCategory state
  useEffect(() => {
    if (scrollActiveSection) {
      setActiveCategory(scrollActiveSection);
    }
  }, [scrollActiveSection]);

  return (
    <>
       <Helmet>
         <title>Cardápio Digital | {tenantConfig.brand.name}</title>
         <meta name="description" content="Explore nosso cardápio de marmitas saudáveis e kits detox. Refeições prontas e congeladas para sua dieta." />
       </Helmet>

      <div className="min-h-screen flex">
        {/* Sidebar fixa - Desktop */}
        <CardapioSidebar
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
          className="hidden md:flex w-60 flex-shrink-0 fixed left-0 top-0 h-screen z-40"
        />

        {/* Conteúdo principal */}
        <div className="flex-1 md:ml-60 bg-muted/30 relative">
          {/* Background Leaf Pattern */}
          <div 
            className="fixed inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M50 15c-10 15-30 22-45 18 10 18 28 25 45 20-18 10-22 28-18 45 18-10 25-28 20-45 10 18 28 22 45 18-18-10-25-28-20-45-10 18-28 22-45 18 18-10 22-28 18-45z' fill='%232d5016' fill-opacity='0.5'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px',
            }}
          />
          
          <CardapioBanner />
          <CardapioHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          
          {/* Hero Banners */}
          <div className="container mx-auto px-4">
            <HeroBanners />
          </div>

          <MobileNav activeCategory={activeCategory} onCategoryClick={handleCategoryClick} />

          <div className="container mx-auto px-4 py-6">
            {/* Main Content */}
            <main className="space-y-8">
              {isLoading ? (
                <div className="space-y-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-8 w-48" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((j) => (
                          <Skeleton key={j} className="h-64 rounded-xl" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Kits Section - with carousel on mobile */}
                  <CategorySection
                    ref={(el) => { sectionRefs.current.kits = el; }}
                    id="kits"
                    title="Kits Detox"
                    icon="🥤"
                    products={filteredProducts.kits}
                    onAddProduct={(p) => handleAddProduct({ ...p, type: "kit", days: p.quantity })}
                    useCarousel={true}
                  />

                  {/* Marmitas Fit - Emagrecimento */}
                  <CategorySection
                    ref={(el) => { sectionRefs.current.fit = el; }}
                    id="fit"
                    title="Marmitas Fit - Emagrecimento (300g)"
                    icon="🥗"
                    products={filteredProducts.fit}
                    onAddProduct={(p) => handleAddProduct({ ...p, type: "marmita", lineType: "emagrecimento", weight: 300 })}
                  />

                  {/* Marmitas Fitness - Hipertrofia */}
                  <CategorySection
                    ref={(el) => { sectionRefs.current.fitness = el; }}
                    id="fitness"
                    title="Marmitas FITNESS - Hipertrofia (450g)"
                    icon="💪"
                    products={filteredProducts.fitness}
                    onAddProduct={(p) => handleAddProduct({ ...p, type: "marmita", lineType: "hipertrofia", weight: 450 })}
                  />
                </>
              )}
            </main>
          </div>

          {/* Floating Cart */}
          <CartFloatingButton onClick={() => setCartOpen(true)} />
        </div>
      </div>

      {/* Cart Drawer */}
      <CartDrawer 
        open={cartOpen} 
        onOpenChange={setCartOpen} 
        onCheckout={() => {
          // Will be handled inside CartDrawer
        }}
      />

      {/* Flavor Selection Modal - Marmitas */}
      <FlavorSelectionModal
        isOpen={flavorModalOpen}
        onClose={() => {
          setFlavorModalOpen(false);
          setPendingProduct(null);
        }}
        onConfirm={handleFlavorConfirm}
        packageName={pendingProduct?.name || ""}
        packageQuantity={pendingProduct?.quantity || 7}
        packageUnitPrice={pendingProduct?.price || 0}
        packageWeight={pendingProduct?.lineType === 'hipertrofia' ? 450 : 300}
        flavorsByCategory={flavorsByCategory}
        flavorStockData={flavorStockData}
        lineType={pendingProduct?.lineType}
      />

      {/* Flavor Selection Modal - Kits */}
      <KitFlavorSelectionModal
        isOpen={kitFlavorModalOpen}
        onClose={() => {
          setKitFlavorModalOpen(false);
          setPendingProduct(null);
        }}
        onConfirm={handleKitFlavorConfirm}
        kitName={pendingProduct?.name || ""}
        juiceQuantity={(pendingProduct?.days || 3) * 4}
        soupQuantity={(pendingProduct?.days || 3) * 2}
        juiceFlavorsData={juiceData.map(j => ({ ...j, description: "" }))}
        soupFlavorsData={soupData.map(s => ({ ...s, description: "" }))}
      />
    </>
  );
};

const Cardapio = () => {
  return (
    <CartProvider>
      <CardapioContent />
    </CartProvider>
  );
};

export default Cardapio;
