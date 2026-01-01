import { forwardRef } from "react";
import { Leaf } from "lucide-react";

const Logo = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="flex items-center gap-2">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Leaf className="w-5 h-5 text-primary" />
        </div>
      </div>
      <span className="text-xl font-bold text-foreground">
        Dieta<span className="text-primary">Já</span>
      </span>
    </div>
  );
});

Logo.displayName = "Logo";

export default Logo;
