import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { Kit } from "@/components/KitsSection";

interface MobileStickyBarProps {
  selectedKit: Kit | null;
  onCtaClick: () => void;
}

const MobileStickyBar = ({ selectedKit, onCtaClick }: MobileStickyBarProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Mostra após rolar 500px
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  const price = selectedKit?.price || 199;
  const label = selectedKit ? selectedKit.name : "A partir de";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-lg font-bold text-foreground">R$ {price}</span>
        </div>
        <Button 
          variant="cta" 
          size="lg" 
          onClick={onCtaClick}
          className="flex-1 max-w-[200px]"
        >
          Pedir agora
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default MobileStickyBar;
