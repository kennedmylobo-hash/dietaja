import { forwardRef } from "react";
import { Leaf } from "lucide-react";
import { useTenantConfig } from "@/hooks/useTenantConfig";

const Logo = forwardRef<HTMLDivElement>((_, ref) => {
  const { brand } = useTenantConfig();

  // If tenant has a logo_url, show the image
  if (brand.logoUrl) {
    return (
      <div ref={ref} className="flex items-center gap-2">
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className="h-10 w-auto object-contain"
        />
      </div>
    );
  }

  // Otherwise, split name for styled text logo
  const brandName = brand.name;
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
