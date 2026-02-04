import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

interface LandingHeaderProps {
  backLink?: string;
  backLabel?: string;
}

const LandingHeader = ({ 
  backLink = "/cardapio", 
  backLabel = "Ver cardápio completo" 
}: LandingHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link 
          to={backLink}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{backLabel}</span>
          <span className="sm:hidden">Cardápio</span>
        </Link>
      </div>
    </header>
  );
};

export default LandingHeader;
