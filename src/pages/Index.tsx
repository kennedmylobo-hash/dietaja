import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Logo from "@/components/Logo";
import HeroSection from "@/components/HeroSection";
import IdentificationSection from "@/components/IdentificationSection";
import SolutionSection from "@/components/SolutionSection";
import KitsSection, { type Kit } from "@/components/KitsSection";
import ValueSection from "@/components/ValueSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import UrgencySection from "@/components/UrgencySection";
import CheckoutSection from "@/components/CheckoutSection";
import FAQSection from "@/components/FAQSection";

// ⚠️ IMPORTANTE: Substitua pelo número real do WhatsApp (formato: 55 + DDD + número)
const WHATSAPP_NUMBER = "5577999999999";

const Index = () => {
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);

  const scrollToKits = () => {
    document.getElementById("kits")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToCheckout = () => {
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectKit = (kit: Kit) => {
    setSelectedKit(kit);
    scrollToCheckout();
  };

  const handleWhatsAppClick = (withMarmitas: boolean) => {
    const kitName = selectedKit?.name || "Kit Detox 5 Dias";
    const kitPrice = selectedKit?.price || 299;
    
    let message = `Oi 😊\nVi o site da *Dieta Já* e quero cuidar melhor da minha alimentação.\n\n`;
    message += `📦 *Pedido:* ${kitName} - R$ ${kitPrice}\n`;
    
    if (withMarmitas) {
      message += `➕ *Adicional:* 20 marmitas saudáveis - R$ 400\n`;
      message += `💰 *Total:* R$ ${kitPrice + 400}\n`;
    }
    
    message += `\n📍 Estou em *Vitória da Conquista*\n\nPode me passar as informações de entrega?`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
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
          <KitsSection onSelectKit={handleSelectKit} />
          <ValueSection />
          <TestimonialsSection />
          <UrgencySection />
          <CheckoutSection 
            selectedKit={selectedKit} 
            onWhatsAppClick={handleWhatsAppClick} 
          />
          <FAQSection onContactClick={handleContactClick} />
        </main>

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

export default Index;
