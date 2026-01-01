import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Logo from "@/components/Logo";
import HeroSection from "@/components/HeroSection";
import IdentificationSection from "@/components/IdentificationSection";
import SolutionSection from "@/components/SolutionSection";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import ProductGallerySection from "@/components/ProductGallerySection";
import KitsSection from "@/components/KitsSection";
import MarmitasSection from "@/components/MarmitasSection";
import CustomDietSection from "@/components/CustomDietSection";
import ValueSection from "@/components/ValueSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import UrgencySection from "@/components/UrgencySection";
import CheckoutSection from "@/components/CheckoutSection";
import GuaranteeSection from "@/components/GuaranteeSection";
import FAQSection from "@/components/FAQSection";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import MobileStickyBar from "@/components/MobileStickyBar";
import SalesNotification from "@/components/SalesNotification";
import { CartProvider, useCart } from "@/components/CartContext";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartDrawer from "@/components/CartDrawer";

// ⚠️ IMPORTANTE: Substitua pelo número real do WhatsApp (formato: 55 + DDD + número)
const WHATSAPP_NUMBER = "5577991001658";

const IndexContent = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const { items, getTotal, clearCart } = useCart();

  const scrollToKits = () => {
    document.getElementById("kits")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToCheckout = () => {
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWhatsAppClick = () => {
    if (items.length === 0) {
      scrollToKits();
      return;
    }

    const total = getTotal();
    const itemsCount = items.length;

    // Track Contact and InitiateCheckout events (Purchase será na página de obrigado)
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Contact');
      (window as any).fbq('track', 'InitiateCheckout', {
        value: total,
        currency: 'BRL',
        num_items: itemsCount
      });
    }

    let message = `Oi 😊\nVi o site da *Dieta Já* e quero cuidar melhor da minha alimentação.\n\n`;
    message += `🛒 *CARRINHO:*\n`;

    items.forEach((item) => {
      if (item.type === "kit") {
        message += `📦 ${item.name} - R$ ${item.totalPrice.toFixed(2).replace(".", ",")}\n`;
      } else {
        message += `🍱 ${item.name} (${item.quantity} marmitas) - R$ ${item.totalPrice.toFixed(2).replace(".", ",")}\n`;
      }
    });

    message += `\n💰 *TOTAL:* R$ ${total.toFixed(2).replace(".", ",")}\n`;
    message += `\n📍 Estou em *Vitória da Conquista*\n\nPode me passar as informações de entrega e pagamento?`;

    const encodedMessage = encodeURIComponent(message);
    
    // Abrir WhatsApp
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
    
    // Limpar carrinho e redirecionar para página de obrigado
    clearCart();
    window.location.href = `/obrigado?total=${total}&items=${itemsCount}`;
  };

  const handleContactClick = () => {
    const message = `Oi 😊\nVi o site da *Dieta Já* e quero cuidar melhor da minha alimentação.\n\n📍 Estou em *Vitória da Conquista*\n\nPode me passar as informações dos kits e entrega?`;
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

        {/* Main content */}
        <main className="pt-16">
          <HeroSection onCtaClick={scrollToKits} />
          <IdentificationSection />
          <SolutionSection />
          <BeforeAfterSection />
          <ProductGallerySection />
          <KitsSection />
          <MarmitasSection />
          <CustomDietSection whatsappNumber={WHATSAPP_NUMBER} />
          <ValueSection />
          <TestimonialsSection />
          <UrgencySection />
          <CheckoutSection onWhatsAppClick={handleWhatsAppClick} />
          <GuaranteeSection />
          <FAQSection onContactClick={handleContactClick} />
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
