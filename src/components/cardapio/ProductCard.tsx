import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  imageUrl?: string | null;
  popular?: boolean;
  onAdd: () => void;
  type: "kit" | "marmita";
}

const ProductCard = ({
  name,
  description,
  price,
  quantity,
  imageUrl,
  popular,
  onAdd,
  type,
}: ProductCardProps) => {
  const totalPrice = quantity ? price * quantity : price;
  const unitLabel = type === "marmita" ? `${quantity} unidades` : "";
  const typeLabel = type === "kit" ? "Kit Detox" : "Combo";

  return (
    <div className="group bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-5xl">
              {type === "kit" ? "🥤" : "🍱"}
            </span>
          </div>
        )}
        
        {/* Type Badge */}
        <Badge className="absolute top-3 left-3 bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-semibold">
          {typeLabel}
        </Badge>

        {/* Popular Badge */}
        {popular && (
          <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs">
            <Star className="h-3 w-3 fill-current" />
            Mais vendido
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2">
          {name}
        </h3>

        {/* Description - Slim Fit style */}
        {description ? (
          <p className="text-sm text-primary font-medium leading-relaxed line-clamp-3">
            {description}
          </p>
        ) : (
          <p className="text-sm text-primary font-medium leading-relaxed line-clamp-3">
            {type === "kit" 
              ? "Kit completo com sucos detox e sopas funcionais para emagrecer com saúde."
              : `Pacote com ${quantity} marmitas congeladas de 300g. Escolha seus sabores favoritos!`
            }
          </p>
        )}

        {/* Unit Price */}
        {quantity && quantity > 1 && (
          <p className="text-sm text-muted-foreground">
            Valor unitário: <span className="font-semibold text-foreground">R$ {price.toFixed(2).replace(".", ",")}</span>
          </p>
        )}

        {/* Quantity info */}
        {unitLabel && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {unitLabel}
          </p>
        )}

        {/* Price and CTA */}
        <div className="flex items-end justify-between gap-3 pt-2 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">A partir de</p>
            <p className="text-2xl font-bold text-foreground">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </p>
          </div>
          
          <Button 
            size="icon"
            variant="outline"
            onClick={onAdd}
            className="h-11 w-11 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
