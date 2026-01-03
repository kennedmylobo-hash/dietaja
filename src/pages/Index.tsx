import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Logo from "@/components/Logo";
import HeroSection from "@/components/HeroSection";
import PromoBannersSection from "@/components/PromoBannersSection";
import SideNavigation from "@/components/SideNavigation";
import IdentificationSection from "@/components/IdentificationSection";
import SolutionSection from "@/components/SolutionSection";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import ProductGallerySection from "@/components/ProductGallerySection";
import KitsSection from "@/components/KitsSection";
import MarmitasSection from "@/components/MarmitasSection";
import ValueSection from "@/components/ValueSection";
import UrgencySection from "@/components/UrgencySection";
import CheckoutSection from "@/components/CheckoutSection";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import MobileStickyBar from "@/components/MobileStickyBar";
import SalesNotification from "@/components/SalesNotification";
import { CartProvider, useCart } from "@/components/CartContext";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartDrawer from "@/components/CartDrawer";
import { getUTMSummary } from "@/lib/utm";
import { useAnalytics, useScrollTracking } from "@/hooks/useAnalytics";
import {
  CustomDietSkeleton,
  TestimonialsSkeleton,
  GuaranteeSkeleton,
  FAQSkeleton,
} from "@/components/skeletons/SectionSkeletons";

// Lazy load below-the-fold sections
const CustomDietSection = lazy(() => import("@/components/CustomDietSection"));
const ReviewsSection = lazy(() => import("@/components/ReviewsSection"));
const GuaranteeSection = lazy(() => import("@/components/GuaranteeSection"));
const FAQSection = lazy(() => import("@/components/FAQSection"));

// ⚠️ IMPORTANTE: Substitua pelo número real do WhatsApp (formato: 55 + DDD + número)
const WHATSAPP_NUMBER = "5577991001658";

const IndexContent = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const { items, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  
  // Analytics tracking
  useAnalytics();
  useScrollTracking();

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToKits = () => scrollToSection("kits");
  const scrollToCheckout = () => scrollToSection("checkout");

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

    let message = `Oi 😊\nVi o site da *Dieta Já* e quero cuidar melhor da minha alimentação.\n\n`;
    
    // Add customer data if provided
    if (customerData) {
      message += `👤 *DADOS:*\n`;
      message += `Nome: ${customerData.name}\n`;
      message += `WhatsApp: ${customerData.phone}\n`;
      message += `Opção: ${customerData.deliveryOption === 'pickup' ? 'Retirada no Recreio' : 'Entrega em domicílio'}\n`;
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

    const deliveryFee = customerData?.deliveryOption === 'delivery' ? 10 : 0;
    const finalTotal = total + deliveryFee;

    message += `\n💰 *SUBTOTAL:* R$ ${total.toFixed(2).replace(".", ",")}\n`;
    if (deliveryFee > 0) {
      message += `🛵 *ENTREGA:* R$ ${deliveryFee.toFixed(2).replace(".", ",")}\n`;
    }
    message += `✅ *TOTAL:* R$ ${finalTotal.toFixed(2).replace(".", ",")}\n`;
    message += `\n📍 Estou em *Vitória da Conquista*${getUTMSummary()}\n\nPode me confirmar o pedido?`;

    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
    
    // Limpar carrinho
    clearCart();
    
    // Navegar com React Router (SPA, sem reload) após pequeno delay
    setTimeout(() => {
      navigate(`/obrigado?total=${finalTotal}&items=${itemsCount}`);
    }, 100);
  };

  const handleContactClick = () => {
    const message = `Oi 😊\nVi o site da *Dieta Já* e quero cuidar melhor da minha alimentação.\n\n📍 Estou em *Vitória da Conquista*${getUTMSummary()}\n\nPode me passar as informações dos kits e entrega?`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
  };

  return (
    <>
      <Helmet>
        <title>Dieta Já | Alimentação Saudável Pronta em Vitória da Conquista</title>
        <meta
          name="description"
          content="Kits detox e marmitas saudáveis prontas para mulheres com rotina corrida em Vitória da Conquista. Coma melhor sem precisar cozinhar."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://dietaja.com.br" />
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
          <HeroSection />
          <PromoBannersSection />
          <IdentificationSection />
          <Suspense fallback={<TestimonialsSkeleton />}>
            <ReviewsSection />
          </Suspense>
          <SolutionSection />
          <BeforeAfterSection />
          <ProductGallerySection />
          <div id="kits">
            <KitsSection />
          </div>
          <div id="marmitas">
            <MarmitasSection />
          </div>
          <Suspense fallback={<CustomDietSkeleton />}>
            <div id="dieta-personalizada">
              <CustomDietSection whatsappNumber={WHATSAPP_NUMBER} />
            </div>
          </Suspense>
          <ValueSection />
          <UrgencySection />
          <CheckoutSection onWhatsAppClick={handleWhatsAppClick} />
          <Suspense fallback={<GuaranteeSkeleton />}>
            <GuaranteeSection />
          </Suspense>
          <Suspense fallback={<FAQSkeleton />}>
            <div id="faq">
              <FAQSection onContactClick={handleContactClick} />
            </div>
          </Suspense>
        </main>

        {/* Cart Floating Button */}
        <CartFloatingButton onClick={() => setCartOpen(true)} />

        {/* Cart Drawer */}
        <CartDrawer
          open={cartOpen}
          onOpenChange={setCartOpen}
          onCheckout={handleWhatsAppClick}
        />

        {/* Floating WhatsApp Button */}
        <WhatsAppFloatingButton phoneNumber={WHATSAPP_NUMBER} />

        {/* Sales Notifications */}
        <SalesNotification />

        {/* Mobile Sticky CTA */}
        <MobileStickyBar onCtaClick={items.length === 0 ? scrollToKits : scrollToCheckout} />

        {/* Footer */}
        <footer className="py-8 bg-card border-t border-border">
          <div className="container px-6 flex flex-col items-center text-center">
            <Logo />
            <p className="text-sm text-muted-foreground mt-4">
              © {new Date().getFullYear()} Dieta Já. Vitória da Conquista, BA.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              A solução que cuida de você enquanto você cuida da sua vida.
            </p>
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
