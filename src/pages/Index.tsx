import { useState, lazy, Suspense, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Logo from "@/components/Logo";
import HeroSection from "@/components/HeroSection";
import PromoBannersSection from "@/components/PromoBannersSection";
import SideNavigation from "@/components/SideNavigation";
// Lazy load below-fold sections for mobile/4G performance
const IdentificationSection = lazy(() => import("@/components/IdentificationSection"));
const SolutionSection = lazy(() => import("@/components/SolutionSection"));
const BeforeAfterSection = lazy(() => import("@/components/BeforeAfterSection"));
const ProductGallerySection = lazy(() => import("@/components/ProductGallerySection"));
const KitsSection = lazy(() => import("@/components/KitsSection"));
const MarmitasSection = lazy(() => import("@/components/MarmitasSection"));
const ValueSection = lazy(() => import("@/components/ValueSection"));
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import MobileStickyBar from "@/components/MobileStickyBar";
import SalesNotification from "@/components/SalesNotification";
import { CartProvider, useCart } from "@/components/CartContext";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartDrawer from "@/components/CartDrawer";
import { getUTMSummary } from "@/lib/utm";
import { useAnalytics, useScrollTracking } from "@/hooks/useAnalytics";
import { useSectionTracking } from "@/hooks/useSectionTracking";
import { useVisitorPresence } from "@/hooks/useRealtimePresence";
import {
  CustomDietSkeleton,
  TestimonialsSkeleton,
  GuaranteeSkeleton,
  FAQSkeleton,
} from "@/components/skeletons/SectionSkeletons";
import { formatCurrency } from "@/config/site";
import { useTenantConfig } from "@/hooks/useTenantConfig";

// Lazy load below-the-fold sections
const CustomDietSection = lazy(() => import("@/components/CustomDietSection"));
const ReviewsSection = lazy(() => import("@/components/ReviewsSection"));
const GuaranteeSection = lazy(() => import("@/components/GuaranteeSection"));
const FAQSection = lazy(() => import("@/components/FAQSection"));

import { SoftIdentificationModal } from "@/components/SoftIdentificationModal";

const IndexContent = () => {
  const { brand, contact, location, seo } = useTenantConfig();
  const [cartOpen, setCartOpen] = useState(false);
  const { 
    items, 
    getTotal, 
    clearCart,
    showIdentificationModal,
    setShowIdentificationModal,
    customerInfo,
    setCustomerInfo,
    confirmAddItem,
  } = useCart();
  const navigate = useNavigate();
  
  // Analytics tracking
  useAnalytics();
  useScrollTracking();
  useVisitorPresence(); // Realtime presence tracking
  const { observeSection } = useSectionTracking();
  
  // Section refs for tracking
  const heroRef = useRef<HTMLDivElement>(null);
  const identificationRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const beforeAfterRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const kitsRef = useRef<HTMLDivElement>(null);
  const marmitasRef = useRef<HTMLDivElement>(null);
  const customDietRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const guaranteeRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  
  // Observe sections for time tracking
  useEffect(() => {
    observeSection(heroRef.current, 'Hero');
    observeSection(identificationRef.current, 'Identificação');
    observeSection(reviewsRef.current, 'Depoimentos');
    observeSection(solutionRef.current, 'Solução');
    observeSection(beforeAfterRef.current, 'Antes/Depois');
    observeSection(galleryRef.current, 'Galeria');
    observeSection(kitsRef.current, 'Kits');
    observeSection(marmitasRef.current, 'Marmitas');
    observeSection(customDietRef.current, 'Dieta Personalizada');
    observeSection(valueRef.current, 'Benefícios');
    observeSection(guaranteeRef.current, 'Garantia');
    observeSection(faqRef.current, 'FAQ');
  }, [observeSection]);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToKits = () => scrollToSection("kits");

  const handleWhatsAppClick = (customerData?: { name: string; phone: string; deliveryOption: string; address?: string }) => {
    if (items.length === 0) {
      scrollToKits();
      return;
    }

    const total = getTotal();
    const itemsCount = items.length;

    // Track Contact and InitiateCheckout events
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Contact');
      (window as any).fbq('track', 'InitiateCheckout', {
        value: total,
        currency: 'BRL',
        num_items: itemsCount
      });
    }

    let message = `Oi 😊\nVi o site da *${brand.name}* e quero cuidar melhor da minha alimentação.\n\n`;
    
    // Add customer data if provided
    if (customerData) {
      message += `👤 *DADOS:*\n`;
      message += `Nome: ${customerData.name}\n`;
      message += `WhatsApp: ${customerData.phone}\n`;
      message += `Opção: ${customerData.deliveryOption === 'pickup' ? `Retirada no ${location.pickupNeighborhood}` : 'Entrega em domicílio'}\n`;
      if (customerData.address) {
        message += `Endereço: ${customerData.address}\n`;
      }
      message += `\n`;
    }
    
    message += `🛒 *CARRINHO:*\n`;

    items.forEach((item) => {
      if (item.type === "kit") {
        message += `📦 ${item.name} - R$ ${item.totalPrice.toFixed(2).replace(".", ",")}\n`;
      } else {
        message += `🍱 ${item.name} (${item.quantity} marmitas) - R$ ${item.totalPrice.toFixed(2).replace(".", ",")}\n`;
      }
    });

    const deliveryFee = customerData?.deliveryOption === 'delivery' ? location.deliveryFee : 0;
    const finalTotal = total + deliveryFee;

    message += `\n💰 *SUBTOTAL:* ${formatCurrency(total)}\n`;
    if (deliveryFee > 0) {
      message += `🛵 *ENTREGA:* ${formatCurrency(deliveryFee)}\n`;
    }
    message += `✅ *TOTAL:* ${formatCurrency(finalTotal)}\n`;
    message += `\n📍 Estou em *${location.city}*${getUTMSummary()}\n\nPode me confirmar o pedido?`;

    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp
    window.open(`https://wa.me/${contact.whatsapp}?text=${encodedMessage}`, "_blank");
    
    // Limpar carrinho
    clearCart();
    
    // Navegar com React Router (SPA, sem reload) após pequeno delay
    setTimeout(() => {
      navigate(`/obrigado?total=${finalTotal}&items=${itemsCount}`);
    }, 100);
  };

  const handleContactClick = () => {
    const message = `Oi 😊\nVi o site da *${brand.name}* e quero cuidar melhor da minha alimentação.\n\n📍 Estou em *${location.city}*${getUTMSummary()}\n\nPode me passar as informações dos kits e entrega?`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${contact.whatsapp}?text=${encodedMessage}`, "_blank");
  };

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta
          name="description"
          content={seo.description}
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container px-6 py-4">
            <Logo />
          </div>
        </header>

        {/* Side Navigation - appears after scrolling past Hero */}
        <SideNavigation />

        {/* Main content */}
        <main className="pt-16 lg:pl-0">
          <div ref={heroRef}>
            <HeroSection />
          </div>
          <PromoBannersSection />
          <Suspense fallback={<div className="py-12"><CustomDietSkeleton /></div>}>
            <div ref={identificationRef}>
              <IdentificationSection />
            </div>
          </Suspense>
          <Suspense fallback={<TestimonialsSkeleton />}>
            <div ref={reviewsRef}>
              <ReviewsSection />
            </div>
          </Suspense>
          <Suspense fallback={<div className="py-12"><CustomDietSkeleton /></div>}>
            <div ref={solutionRef}>
              <SolutionSection />
            </div>
          </Suspense>
          <Suspense fallback={<div className="py-12"><CustomDietSkeleton /></div>}>
            <div ref={beforeAfterRef}>
              <BeforeAfterSection />
            </div>
          </Suspense>
          <Suspense fallback={<div className="py-12"><CustomDietSkeleton /></div>}>
            <div ref={galleryRef}>
              <ProductGallerySection />
            </div>
          </Suspense>
          <Suspense fallback={<div className="py-12"><CustomDietSkeleton /></div>}>
            <div id="kits" ref={kitsRef}>
              <KitsSection />
            </div>
          </Suspense>
          <Suspense fallback={<div className="py-12"><CustomDietSkeleton /></div>}>
            <div id="marmitas" ref={marmitasRef}>
              <MarmitasSection />
            </div>
          </Suspense>
          <Suspense fallback={<CustomDietSkeleton />}>
            <div id="dieta-personalizada" ref={customDietRef}>
              <CustomDietSection whatsappNumber={contact.whatsapp} />
            </div>
          </Suspense>
          <Suspense fallback={<div className="py-12"><CustomDietSkeleton /></div>}>
            <div ref={valueRef}>
              <ValueSection />
            </div>
          </Suspense>
          <Suspense fallback={<GuaranteeSkeleton />}>
            <div ref={guaranteeRef}>
              <GuaranteeSection />
            </div>
          </Suspense>
          <Suspense fallback={<FAQSkeleton />}>
            <div id="faq" ref={faqRef}>
              <FAQSection onContactClick={handleContactClick} />
            </div>
          </Suspense>
        </main>

        {/* Soft Identification Modal */}
        <SoftIdentificationModal
          open={showIdentificationModal}
          onConfirm={(name, phone, email) => {
            setCustomerInfo({
              ...customerInfo,
              name,
              phone,
              email,
            });
            confirmAddItem();
          }}
        />

        {/* Cart Floating Button */}
        <CartFloatingButton onClick={() => setCartOpen(true)} />

        {/* Cart Drawer */}
        <CartDrawer
          open={cartOpen}
          onOpenChange={setCartOpen}
          onCheckout={handleWhatsAppClick}
        />

        {/* Floating WhatsApp Button */}
        <WhatsAppFloatingButton />

        {/* Sales Notifications */}
        <SalesNotification />

        {/* Mobile Sticky CTA */}
        <MobileStickyBar onCtaClick={() => setCartOpen(true)} />

        {/* Footer */}
        <footer className="py-8 bg-card border-t border-border">
          <div className="container px-6 flex flex-col items-center text-center">
            <Logo />
            <p className="text-sm text-muted-foreground mt-4">
              © {new Date().getFullYear()} {brand.name}. {location.city}, {location.state}.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              A solução que cuida de você enquanto você cuida da sua vida.
            </p>
            <a
              href="/monte-seu-cardapio"
              className="mt-4 text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              🤖 Precisando de ajuda para montar seu pedido? Clique aqui
            </a>
          </div>
        </footer>
      </div>
    </>
  );
};

const Index = () => {
  return (
    <CartProvider>
      <IndexContent />
    </CartProvider>
  );
};

export default Index;
