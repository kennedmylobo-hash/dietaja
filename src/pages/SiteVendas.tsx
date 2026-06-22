import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { CartProvider, useCart } from "@/components/CartContext";
import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";
import CartFloatingButton from "@/components/CartFloatingButton";
import SiteCartDrawer from "@/components/SiteCartDrawer";
import ProductDetailModal from "@/components/ProductDetailModal";
import DietaPersonalizadaModal from "@/components/DietaPersonalizadaModal";
import KitFlavorPicker from "@/components/KitFlavorPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ShoppingCart, ChevronRight, Star, Clock, Shield, Truck, Phone, Instagram, Facebook, Menu, X, ArrowRight, Plus, Check, ChevronDown, Gift, Percent, MapPin, ArrowUp, Zap, Share2, Sun, Moon } from "lucide-react";

interface Flavor {
  id: string;
  name: string;
  category: string;
  sides: any;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  fiber_g?: number;
  price_override_fit?: number;
  price_override_fitness?: number;
  allergens?: string[];
  restrictions?: string[];
  stock_quantity?: number;
  image_url?: string;
  featured?: boolean;
}

interface Package {
  id: string;
  name: string;
  line_type: string;
  quantity: number;
  unit_price: number;
  weight: number;
  description?: string;
  image_url?: string;
  popular: boolean;
}

interface KitPackage {
  id: string;
  name: string;
  days: number;
  price: number;
  description?: string;
  features: string[];
  popular: boolean;
}

const categoryIcons: Record<string, string> = {
  carnes: "🥩",
  frangos: "🐔",
  massas: "🍝",
  especiais: "⭐",
  peixes: "🐟",
  vegetariano: "🥬",
  sopas: "🍲",
};

const categoryLabels: Record<string, string> = {
  carnes: "Carnes",
  frangos: "Frangos",
  massas: "Massas",
  especiais: "Especiais",
  peixes: "Peixes",
  vegetariano: "Vegetariano",
  sopas: "Sopas",
};

const categoryDescriptions: Record<string, string> = {
  carnes: "Carnes selecionadas, preparadas com temperos especiais. Opções que vão do clássico ao sofisticado.",
  frangos: "Frango grelhado, desfiado, ao curry ou estrogonofe. Versatilidade e sabor em cada receita.",
  massas: "Massas artesanais com molhos caseiros. Conforto em forma de comida.",
  especiais: "Receitas especiais que fogem do comum. Para variar o cardápio com muito sabor.",
  peixes: "Peixes grelhados e receitas leves. Rica em ômega-3 e proteínas de alto valor.",
  vegetariano: "Opções sem carne, ricas em proteínas vegetais. Para todos os paladares.",
  sopas: "Sopas funcionais e cremosas. Perfeitas para dias frios ou refeições leves.",
};

const categoryBgColors: Record<string, string> = {
  carnes: "from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10",
  frangos: "from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10",
  massas: "from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10",
  especiais: "from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10",
  peixes: "from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10",
  vegetariano: "from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10",
  sopas: "from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10",
};

const heroFoodImage = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1400&q=80";

const comoFuncionaSteps = [
  {
    step: "01", title: "Escolha", desc: "Selecione seus sabores preferidos e monte seu pedido",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",
    alt: "Pessoa escolhendo marmitas no celular"
  },
  {
    step: "02", title: "Agende", desc: "Defina o melhor dia da semana para receber",
    img: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=400&q=80",
    alt: "Calendário com data agendada"
  },
  {
    step: "03", title: "Receba", desc: "Entregamos fresquinho na porta da sua casa",
    img: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80",
    alt: "Entrega de comida em casa"
  },
  {
    step: "04", title: "Aqueça", desc: "Pronto em minutos no micro-ondas. Sem sujeira, sem trabalho",
    img: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400&q=80",
    alt: "Marmita sendo aquecida no micro-ondas"
  },
];

const faqItems = [
  {
    q: "Qual o pedido mínimo?",
    a: "O pedido mínimo é de {min} unidades. Você pode misturar sabores à vontade dentro do pacote escolhido."
  },
  {
    q: "Como funciona a entrega?",
    a: "Trabalhamos com entrega programada. Você escolhe o melhor dia da semana para receber e nós levamos tudo fresquinho até você."
  },
  {
    q: "Como conservar as marmitas?",
    a: "As marmitas devem ser mantidas congeladas (-18°C) e valem por até 90 dias. Na geladeira, duram até 5 dias."
  },
  {
    q: "Como aquecer?",
    a: "Basta retirar a embalagem plástica e aquecer no micro-ondas por 3-4 minutos ou em fogo baixo na panela por 5-7 minutos."
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "Aceitamos PIX, cartão de crédito (Visa, Mastercard, Elo, Amex) e pagamento via WhatsApp."
  },
  {
    q: "Posso cancelar ou alterar meu pedido?",
    a: "Sim! Você pode cancelar ou alterar o pedido com até 24h de antecedência da produção. É só entrar em contato pelo WhatsApp."
  },
];

const deliveryCities = [
  { state: "BA", cities: ["Vitória da Conquista"] },
];

const menuCategories = [
  { key: "cardapio", label: "Cardápio", items: [
    { href: "#produtos", label: "Marmitas" },
    { href: "#kits", label: "Kits" },
  ]},
  { key: "objetivos", label: "Objetivos", items: [
    { href: "#produtos", label: "Emagrecimento" },
    { href: "#produtos", label: "Performance" },
  ]},
  { key: "marca", label: "A DietaJá", items: [
    { href: "#como-funciona", label: "Como Funciona" },
    { href: "#faq", label: "Dúvidas" },
    { href: "#contato", label: "Contato" },
  ]},
];

const SiteVendasContent = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { brand, contact, location, seo } = useTenantConfig();
  const { addItem, showIdentificationModal, setShowIdentificationModal, setCustomerInfo, confirmAddItem, isIdentified, items: cartItems } = useCart();

  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [kits, setKits] = useState<KitPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [lineMode, setLineMode] = useState<"emagrecimento" | "hipertrofia">("emagrecimento");
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(false);
      const [flavorsRes, packagesRes, kitsRes] = await Promise.all([
        supabase.from("marmita_flavors").select("*").eq("active", true).order("sort_order"),
        supabase.from("marmita_packages").select("*").eq("active", true).order("sort_order"),
        supabase.from("kit_packages").select("*").eq("active", true).order("sort_order"),
      ]);
      if (flavorsRes.error || packagesRes.error || kitsRes.error) {
        setFetchError(true);
      } else {
        if (flavorsRes.data) setFlavors(flavorsRes.data as unknown as Flavor[]);
        if (packagesRes.data) setPackages(packagesRes.data as unknown as Package[]);
        if (kitsRes.data) setKits(kitsRes.data as unknown as KitPackage[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const categories = [...new Set(flavors.map(f => f.category))];
  const flavorsByCategory = categories.map(cat => ({
    id: cat,
    name: categoryLabels[cat] || cat,
    flavors: flavors.filter(f => f.category === cat).map(f => f.name),
  }));
  const flavorStockData = flavors.map(f => ({
    name: f.name,
    stock_quantity: 999,
    show_stock: false,
    low_stock_threshold: 5,
    sides: f.sides,
    image_url: f.image_url,
    price_override_fit: f.price_override_fit,
    price_override_fitness: f.price_override_fitness,
    calories: f.calories,
    protein_g: f.protein_g,
  }));
  const featuredFlavors = flavors.filter(f => f.featured).length > 0
    ? flavors.filter(f => f.featured)
    : flavors.slice(0, 8);

  const getFlavorPrice = (flavor: Flavor): { fit: number; fitness: number } => {
    const cheapestFit = packages.filter(p => p.line_type === "emagrecimento").sort((a, b) => a.unit_price - b.unit_price)[0];
    const cheapestFitness = packages.filter(p => p.line_type === "fitness" || p.line_type === "hipertrofia").sort((a, b) => a.unit_price - b.unit_price)[0];
    return {
      fit: flavor.price_override_fit || cheapestFit?.unit_price || 19.90,
      fitness: flavor.price_override_fitness || cheapestFitness?.unit_price || 24.90,
    };
  };

  const currentPrice = (flavor: Flavor): number => lineMode === "emagrecimento" ? getFlavorPrice(flavor).fit : getFlavorPrice(flavor).fitness;
  const currentWeight = lineMode === "emagrecimento" ? "300g" : "450g";
  const currentKcal = (flavor: Flavor): string => lineMode === "emagrecimento" ? `${flavor.calories || 350}` : `${Math.round((flavor.calories || 350) * 1.25)}`;

  const getFlavorDescription = (flavor: Flavor): string => {
    try {
      const sides = flavor.sides as any;
      if (!sides) return "";
      const fitSides = sides.fit || sides.emagrecimento;
      if (!fitSides || !Array.isArray(fitSides)) return "";
      return fitSides.map((s: any) => `${s.weight}g ${s.name}`).join(" + ");
    } catch {
      return "";
    }
  };

  const handleAddFlavor = async (flavor: Flavor) => {
    const key = `${flavor.id}-${lineMode}`;
    setAddingId(key);
    const isFit = lineMode === "emagrecimento";
    const cheapestPack = packages
      .filter(p => p.line_type === lineMode)
      .sort((a, b) => a.unit_price - b.unit_price)[0];
    const priceKey = isFit ? "price_override_fit" : "price_override_fitness";
    const unitPrice = flavor[priceKey as keyof Flavor] as number || cheapestPack?.unit_price || (isFit ? 19.90 : 24.90);
    const label = isFit ? "FIT" : "FITNESS";
    const weight = isFit ? "300g" : "450g";
    addItem({
      type: "marmita",
      name: `${flavor.name} (${label})`,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
      lineType: lineMode,
    } as any, true);
    setTimeout(() => setAddingId(null), 800);
    if (cartItems.length === 0) confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    toast(`${flavor.name} ${label} adicionado!`, {
      description: `R$ ${(unitPrice as number).toFixed(2).replace(".", ",")} — ${weight} no carrinho`,
      icon: "🛒",
      duration: 2000,
    });
    if (isIdentified) setCartOpen(true);
  };

  const handleKitConfirm = (selections: { name: string; quantity: number }[], totalQty: number) => {
    if (!selectedPkg) return;
    const label = lineMode === "emagrecimento" ? "FIT" : "FITNESS";
    selections.forEach((sel) => {
      for (let i = 0; i < sel.quantity; i++) {
        addItem({
          type: "marmita",
          name: `${sel.name} (${label})`,
          quantity: 1,
          unitPrice: selectedPkg.unit_price,
          totalPrice: selectedPkg.unit_price,
          lineType: lineMode,
        } as any, true);
      }
    });
    setKitModalOpen(false);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    toast(`Kit ${label} ${selectedPkg.quantity} unidades adicionado! 🛒`, { duration: 2500 });
    if (isIdentified) setCartOpen(true);
  };

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [dietaOpen, setDietaOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whatsappLink = contact.whatsappFormatted
    ? `https://wa.me/${contact.whatsappFormatted}`
    : (tenant?.whatsapp ? `https://wa.me/${tenant.whatsapp}` : "#");

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-20 space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2">Ops, algo deu errado</h2>
          <p className="text-muted-foreground mb-6">Não foi possível carregar o cardápio. Verifique sua conexão e tente novamente.</p>
          <Button onClick={() => window.location.reload()} className="gap-2">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Helmet>
        <title>{seo?.title || "Dieta Já | Marmitas Saudáveis em Vitória da Conquista"}</title>
        <meta name="description" content={seo?.description || "Peça marmitas saudáveis online em Vitória da Conquista. PIX, entrega programada."} />
        <meta property="og:title" content={seo?.title || "Dieta Já | Marmitas Saudáveis"} />
        <meta property="og:description" content={seo?.description || "Marmitas saudáveis prontas para sua rotina. Peça online!"} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <a href="/" className="font-bold text-lg">{brand.name || "DietaJá"}</a>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {menuCategories.map(cat => (
              <div key={cat.key} className="relative group" onMouseEnter={() => setMenuOpen(cat.key)} onMouseLeave={() => setMenuOpen(null)}>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                  {cat.label} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen === cat.key ? "rotate-180" : ""}`} />
                </button>
                {menuOpen === cat.key && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border py-2 z-50">
                    {cat.items.map(item => (
                      <a key={item.label} href={item.href} onClick={() => setMenuOpen(null)} className="block px-4 py-2 hover:bg-muted transition-colors">
                        {item.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="w-5 h-5" />
            </Button>
            <Button size="sm" onClick={() => scrollTo("produtos")}>
              Pedir <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t bg-background overflow-hidden"
            >
              <div className="px-4 py-4 space-y-3">
                {menuCategories.map(cat => (
                  <div key={cat.key}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{cat.label}</p>
                    {cat.items.map(item => (
                      <button key={item.label} onClick={() => scrollTo(item.href.replace("#", ""))} className="block w-full text-left text-sm font-medium hover:text-primary py-1.5">
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <Button className="w-full" onClick={() => { scrollTo("produtos"); setMobileMenuOpen(false); }}>Ver Cardápio</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Cashback banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium">
          <Gift className="w-4 h-4 text-primary" />
          <span>Até <strong>10% de cashback</strong> na sua primeira compra. Frete grátis acima de R$ 290.</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img src={heroFoodImage} alt="" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-transparent" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur">{location.city || "Sua região"}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
              {brand.slogan || "Comida fit deliciosa que cabe na sua rotina"}
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Marmitas FIT e FITNESS preparadas por chefs com ingredientes selecionados.
              Pedido mínimo {packages[0]?.quantity || 7} unidades. Entrega programada.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100" onClick={() => scrollTo("produtos")}>
                Ver Cardápio <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => window.open(whatsappLink, "_blank")}>
                <Phone className="w-4 h-4 mr-2" /> Fale Conosco
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-b bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-primary" /> <span>Entrega programada</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Star className="w-4 h-4 text-primary" /> <span>Ingredientes frescos</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-primary" /> <span>Qualidade garantida</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" /> <span>Pronto em minutos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Seletor de linha — aparece antes de tudo */}
      <div className="bg-white dark:bg-gray-950 border-b sticky top-14 md:top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <p className="text-xs text-center text-muted-foreground mb-2 font-medium">🎯 Escolha o seu objetivo:</p>
          <div className="flex items-center justify-center gap-2 bg-muted/50 rounded-xl p-1 max-w-xs mx-auto">
            <button onClick={() => setLineMode("emagrecimento")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${lineMode === "emagrecimento" ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              🔥 FIT · Definição
            </button>
            <button onClick={() => setLineMode("hipertrofia")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${lineMode === "hipertrofia" ? "bg-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              💪 FITNESS · Massa
            </button>
          </div>
          <p className="text-[11px] text-center text-muted-foreground mt-1.5">
            {lineMode === "emagrecimento" ? "🥩 FIT 300g · ~350kcal · Emagrecimento e definição" : "💪 FITNESS 450g · ~420kcal · Hipertrofia e ganho de massa"}
          </p>
        </div>
      </div>

      {/* Mais Vendidos — Kits na ordem estratégica */}
      {packages.filter(p => p.line_type === (lineMode === "emagrecimento" ? "emagrecimento" : "fitness")).length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">🔥 Mais Vendidos</h2>
              <p className="text-muted-foreground mt-1">Os planos preferidos dos nossos clientes</p>
            </div>
            <Button variant="ghost" onClick={() => scrollTo("kits")} className="gap-1">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {packages
              .filter(p => p.line_type === (lineMode === "emagrecimento" ? "emagrecimento" : "fitness"))
              .sort((a, b) => {
                const order = [21, 14, 7, 28];
                return order.indexOf(a.quantity) - order.indexOf(b.quantity);
              })
              .map(pkg => {
                const isFit = lineMode === "emagrecimento";
                const total = (pkg.unit_price * pkg.quantity);
                const savings = pkg.quantity >= 28 ? "40%" : pkg.quantity >= 21 ? "30%" : pkg.quantity >= 14 ? "15%" : "";
                return (
                  <Card key={pkg.id} className={`min-w-[200px] sm:min-w-[220px] snap-start shrink-0 cursor-pointer hover:shadow-lg transition-shadow ${pkg.popular ? "ring-2 ring-yellow-400" : ""}`}
                    onClick={() => { setSelectedPkg(pkg); setKitModalOpen(true); }}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isFit ? "bg-green-50 text-green-700" : "bg-purple-50 text-purple-700"}`}>
                          {isFit ? "FIT" : "FITNESS"}
                        </span>
                        <span className="text-sm font-bold">{pkg.quantity} unidades</span>
                        {savings && <Badge variant="default" className="bg-yellow-500 text-black border-0 text-[9px]">Economia {savings}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{isFit ? "300g cada · ~350kcal" : "450g cada · ~420kcal"}</p>
                      <div className="flex items-end gap-2 mt-2">
                        <span className={`text-2xl font-bold ${isFit ? "text-green-600" : "text-purple-600"}`}>
                          R$ {pkg.unit_price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-xs text-muted-foreground mb-1">/un</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Total: R$ {total.toFixed(2).replace(".", ",")}</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>Mais vendido</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </motion.section>
      )}

      {/* Products by category */}
      <motion.section
        id="produtos"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Nosso Cardápio</h2>
          <p className="text-muted-foreground">Escolha seus sabores preferidos</p>
        </div>

        {categories.length > 0 ? (
          <Tabs defaultValue={categories[0]}>
            <TabsList className="mb-8 flex-wrap h-auto">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="gap-1">
                  {categoryIcons[cat] || "🍽️"} {categoryLabels[cat] || cat}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map(cat => (
              <TabsContent key={cat} value={cat}>
                <div className={`rounded-xl bg-gradient-to-br ${categoryBgColors[cat] || "from-muted/50 to-muted/20"} p-6 mb-6`}>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    {categoryDescriptions[cat] || ""}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {flavors.filter(f => f.category === cat).map(flavor => {
                    const desc = getFlavorDescription(flavor);
                    const price = getFlavorPrice(flavor);
                    return (
                      <Card key={flavor.id} className="group hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => { setSelectedFlavor(flavor); setDetailOpen(true); }}>
                        <CardContent className="p-4">
                          <div className="relative">
                            {flavor.image_url ? (
                              <div className="w-full aspect-[4/2.6] rounded-lg overflow-hidden mb-2 bg-muted">
                                <img src={flavor.image_url} alt={flavor.name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ) : (
                              <div className="text-4xl mb-3">{categoryIcons[cat] || "🍽️"}</div>
                            )}
                            {flavor.stock_quantity !== undefined && flavor.stock_quantity <= 10 && flavor.stock_quantity > 0 && (
                              <Badge className="absolute top-1 right-1 bg-amber-500 text-white border-0 text-[9px]">
                                {flavor.stock_quantity <= 3 ? "Últimas unidades!" : `Só ${flavor.stock_quantity}`}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-base mb-1">{flavor.name}</h3>
                          {desc && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{desc}</p>
                          )}
                          <div className="mb-2 flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lineMode === "emagrecimento" ? "bg-green-50 text-green-700" : "bg-purple-50 text-purple-700"}`}>
                              {lineMode === "emagrecimento" ? "FIT" : "FITNESS"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{currentWeight}</span>
                            {flavor.calories && (
                              <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                🔥 ~{currentKcal(flavor)}kcal
                              </span>
                            )}
                          </div>
                          {flavor.allergens && flavor.allergens.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {flavor.allergens.map(a => (
                                <Badge key={a} variant="outline" className="text-[9px] px-1.5 py-0">{a}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className={`font-bold text-sm ${lineMode === "emagrecimento" ? "text-green-600" : "text-purple-600"}`}>
                              R$ {currentPrice(flavor).toFixed(2).replace(".", ",")}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/site?produto=${encodeURIComponent(flavor.name)}`); toast("Link copiado! 📋"); }}
                                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Compartilhar"
                              >
                                <Share2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddFlavor(flavor); }}
                                className={`h-7 w-7 flex items-center justify-center rounded-full border transition-colors ${addingId === `${flavor.id}-${lineMode}` ? "text-white" : ""} ${lineMode === "emagrecimento" ? "border-green-600 text-green-600 hover:bg-green-600 hover:text-white" : "border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"}`}
                              >
                                {addingId === `${flavor.id}-${lineMode}` ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Cardápio em breve</p>
          </div>
        )}
      </motion.section>

      {/* Kits section */}
      <section id="kits" className="bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-16">
          {/* Kits de Marmitas Congeladas */}
          {packages.filter(p => p.line_type === "emagrecimento").length > 0 && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Kits de Marmitas 🥗</h2>
                <p className="text-muted-foreground">Escolha a quantidade ideal pra você</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {packages
                  .filter(p => p.line_type === (lineMode === "emagrecimento" ? "emagrecimento" : "fitness"))
                  .sort((a, b) => a.quantity - b.quantity)
                  .map(pkg => {
                  const isFit = lineMode === "emagrecimento";
                  return (
                    <Card key={pkg.id} className={`relative ${pkg.popular ? `ring-2 ${isFit ? "ring-green-500" : "ring-purple-500"}` : ""}`}>
                      {pkg.popular && <Badge className={`absolute -top-2 -right-2 ${isFit ? "bg-green-600" : "bg-purple-600"}`}>Mais Popular</Badge>}
                      <CardContent className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${isFit ? "bg-green-50 text-green-700" : "bg-purple-50 text-purple-700"}`}>
                            {isFit ? "FIT" : "FITNESS"}
                          </span>
                          <span className="text-lg font-bold">{pkg.quantity} unidades</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{isFit ? "🥩 300g cada · ~350kcal" : "💪 450g cada · ~420kcal"}</p>
                        <p className={`text-2xl font-bold mb-1 ${isFit ? "text-green-600" : "text-purple-600"}`}>
                          R$ {pkg.unit_price.toFixed(2).replace(".", ",")}
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">por unidade</p>
                        <Button className="w-full" size="sm" onClick={() => { setSelectedPkg(pkg); setKitModalOpen(true); }}>
                          Montar Pedido <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kits Detox — só aparece no modo Definição/Emagrecimento */}
          {kits.length > 0 && lineMode === "emagrecimento" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Kits Detox 🥤</h2>
                <p className="text-muted-foreground">Sucos e sopas para desintoxicar e renovar as energias</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {kits.map(kit => (
                  <Card key={kit.id} className={`relative ${kit.popular ? "ring-2 ring-primary" : ""}`}>
                    {kit.popular && <Badge className="absolute -top-2 -right-2">Mais Popular</Badge>}
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl mb-3">🥤</div>
                      <h3 className="font-bold text-lg mb-1">{kit.name}</h3>
                      <p className="text-2xl font-bold text-primary mb-2">
                        R$ {kit.price.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">{kit.days} dias</p>
                      {kit.description && <p className="text-sm mb-4">{kit.description}</p>}
                      {kit.features && Array.isArray(kit.features) && kit.features.length > 0 && (
                        <ul className="text-xs text-left space-y-1 mb-4">
                          {kit.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button className="w-full" onClick={() => scrollTo("produtos")}>
                        Quero este Kit <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Como Funciona */}
      <motion.section
        id="como-funciona"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Como Funciona</h2>
          <p className="text-muted-foreground">Simples, rápido e prático — em 4 passos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {comoFuncionaSteps.map((item, i) => (
            <Card key={i} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={item.img} alt={item.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
              <CardContent className="p-4 text-center">
                <Badge variant="outline" className="mb-2">{item.step}</Badge>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section
        id="faq"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="bg-muted/30 border-y">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">Dúvidas Frequentes</h2>
            <p className="text-muted-foreground">Tire suas principais dúvidas sobre o serviço</p>
          </div>
          <div className="space-y-2">
            {faqItems.map((item, i) => {
              const isOpen = openFaq === i;
              const minQty = packages[0]?.quantity || 7;
              return (
                <div key={i} className="bg-background rounded-xl border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left font-medium hover:bg-muted/50 transition-colors"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    <span>{item.q.replace("{min}", String(minQty))}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {item.a.replace("{min}", String(minQty))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Reviews / Social Proof */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Quem já experimentou 💚</h2>
          <p className="text-muted-foreground">Veja o que nossos clientes estão falando</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Ana Carolina", rating: 5, text: "Simplesmente amei! As marmitas são deliciosas e super práticas. Pedi o pacote de 14 FIT e já estou sentindo diferença na minha rotina 🥗", days: "há 3 dias" },
            { name: "Rafael Oliveira", rating: 5, text: "Dieta personalizada foi a melhor escolha! Montei meu cardápio do meu jeito e recebo tudo certinho. Recomendo demais!", days: "há 1 semana" },
            { name: "Juliana Santos", rating: 5, text: "Comprei o kit detox de 5 dias e amei! Perdi 3kg em uma semana e me senti muito mais disposta. Vou continuar com as marmitas FIT", days: "há 2 semanas" },
            { name: "Marcos Costa", rating: 4, text: "Qualidade excelente! O frango grelhado é o meu favorito. A entrega é super pontual e o pessoal do WhatsApp é muito atencioso", days: "há 2 semanas" },
            { name: "Luciana Mendes", rating: 5, text: "Finalmente uma marmita fit que tem gosto de comida de verdade! Meu marido ama a de estrogonofe. Pedido 28 unidades por mês já 😋", days: "há 3 semanas" },
            { name: "Pedro Almeida", rating: 5, text: "Tô fazendo dieta pra ganhar massa e as marmitas FITNESS são perfeitas! 400g bem servidas, muita proteína. Tô evoluindo bonito 💪", days: "há 1 mês" },
          ].map((review, i) => (
            <Card key={i} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className={`w-3.5 h-3.5 ${j < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{review.text}"</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium">{review.name}</span>
                  <span className="text-[10px] text-muted-foreground">{review.days}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* Soft prompt: salvar carrinho com WhatsApp */}
      {cartItems.length >= 3 && !isIdentified && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-32 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-primary text-primary-foreground rounded-xl p-3 shadow-lg flex items-center gap-3 text-sm">
            <span className="text-lg">🔒</span>
            <p className="flex-1">Quer salvar seu carrinho? Deixe seu WhatsApp e não perca seus itens!</p>
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0 whitespace-nowrap"
              onClick={() => {
                setShowIdentificationModal(true);
              }}
            >
              Salvar agora
            </Button>
          </div>
        </motion.div>
      )}

      {/* Cart */}
      <CartFloatingButton onClick={() => setCartOpen(true)} />
      <SiteCartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        onAddMore={() => { setCartOpen(false); setTimeout(() => scrollTo("produtos"), 300); }}
      />

      <SoftIdentificationModal
        open={showIdentificationModal}
        onConfirm={(name, phone, email) => {
          setCustomerInfo({ name, phone, email, cartId: null });
          confirmAddItem();
          setCartOpen(true);
        }}
        onSkip={() => {
          setShowIdentificationModal(false);
          confirmAddItem();
          setCartOpen(true);
        }}
      />

      <ProductDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        flavor={selectedFlavor ? { ...selectedFlavor, price: getFlavorPrice(selectedFlavor) } : null}
        lineMode={lineMode}
        onAdd={() => { if (selectedFlavor) { handleAddFlavor(selectedFlavor); setDetailOpen(false); } }}
        adding={addingId}
      />

      {/* Kit Flavor Picker */}
      {selectedPkg && (
        <KitFlavorPicker
          isOpen={kitModalOpen}
          onClose={() => setKitModalOpen(false)}
          onConfirm={handleKitConfirm}
          packageName={selectedPkg.name}
          packageQuantity={selectedPkg.quantity}
          packageUnitPrice={selectedPkg.unit_price}
          packageWeight={lineMode === "emagrecimento" ? 300 : 450}
          flavorsByCategory={flavorsByCategory}
          flavorStockData={flavorStockData}
          lineType={lineMode}
        />
      )}

      {/* CTA */}
      <section className="bg-primary/5 border-y">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para pedir?</h2>
          <p className="text-muted-foreground mb-8">
            Monte seu cardápio personalizado e receba em casa. Pedido mínimo de {packages[0]?.quantity || 7} unidades.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" onClick={() => scrollTo("produtos")}>
              Montar Pedido <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setDietaOpen(true)} className="gap-2">
              Dieta Personalizada
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-gray-900 dark:bg-gray-950 text-gray-300">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-white mb-3">{brand.name || "DietaJá"}</h3>
              <p className="text-sm">Comida fit de verdade, feita com ingredientes selecionados.</p>
              {location.city && (
                <p className="text-sm mt-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {location.city}{location.state ? `, ${location.state}` : ""}
                </p>
              )}
              <div className="flex items-center gap-3 mt-4">
                <a href="#" className="hover:text-white"><Instagram className="w-4 h-4" /></a>
                <a href="#" className="hover:text-white"><Facebook className="w-4 h-4" /></a>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Links</h3>
              <div className="space-y-2 text-sm">
                <a href="/cardapio" className="block hover:text-white">Cardápio</a>
                <a href="/monte-seu-cardapio" className="block hover:text-white">Monte seu Cardápio</a>
                <a href="/clubedietaja" className="block hover:text-white">Clube DietaJá</a>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Área de Entrega</h3>
              <div className="space-y-2 text-xs">
                {deliveryCities.map(area => (
                  <div key={area.state}>
                    <p className="font-semibold text-gray-400">{area.state}</p>
                    <p>{area.cities.join(", ")}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white mb-3">Contato</h3>
              <div className="space-y-2 text-sm">
                {contact.whatsappFormatted && (
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                <p className="text-xs text-gray-500 mt-3">Pagamento 100% seguro</p>
                <div className="flex flex-wrap gap-1 mt-1 text-xs">
                  <span className="bg-gray-800 px-2 py-1 rounded">PIX</span>
                  <span className="bg-gray-800 px-2 py-1 rounded">Cartão</span>
                  <span className="bg-gray-800 px-2 py-1 rounded">WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} {brand.name || "DietaJá"}. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <DietaPersonalizadaModal
        open={dietaOpen}
        onOpenChange={setDietaOpen}
        whatsappLink={whatsappLink}
        tenantName={brand.name || "DietaJá"}
      />

      {/* WhatsApp floating */}
      <motion.a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-24 right-4 z-50 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-colors"
        aria-label="Fale conosco pelo WhatsApp"
      >
        <Phone className="w-5 h-5" />
      </motion.a>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-44 right-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

const SiteVendas = () => (
  <CartProvider>
    <SiteVendasContent />
  </CartProvider>
);

export default SiteVendas;
