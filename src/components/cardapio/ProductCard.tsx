import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const unitLabel = type === "marmita" ? `${quantity}un` : "";

  return (
    <div className="group bg-card rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-4xl">
              {type === "kit" ? "🥤" : "🍱"}
            </span>
          </div>
        )}
        
        {/* Badges */}
        {popular && (
          <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600 text-white gap-1">
            <Star className="h-3 w-3 fill-current" />
            Mais vendido
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-2">
            {name}
          </h3>
          {unitLabel && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              {unitLabel}
            </Badge>
          )}
        </div>

        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-lg font-bold text-primary">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </p>
            {quantity && quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                R$ {price.toFixed(2).replace(".", ",")}/un
              </p>
            )}
          </div>
          
          <Button 
            size="sm" 
            onClick={onAdd}
            className="gap-1.5 shadow-md"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
