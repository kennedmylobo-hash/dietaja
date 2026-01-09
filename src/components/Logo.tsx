import { forwardRef } from "react";
import { Leaf } from "lucide-react";
import { siteConfig } from "@/config/site";

const Logo = forwardRef<HTMLDivElement>((_, ref) => {
  // Divide o nome da marca para colorir a segunda parte
  const brandName = siteConfig.brand.name;
  const words = brandName.split(' ');
  const firstPart = words.length > 1 ? words.slice(0, -1).join(' ') : brandName.slice(0, -2);
  const secondPart = words.length > 1 ? words[words.length - 1] : brandName.slice(-2);

  return (
    <div ref={ref} className="flex items-center gap-2">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Leaf className="w-5 h-5 text-primary" />
        </div>
      </div>
      <span className="text-xl font-bold text-foreground">
        {firstPart}<span className="text-primary">{secondPart}</span>
      </span>
    </div>
  );
});

Logo.displayName = "Logo";

export default Logo;
