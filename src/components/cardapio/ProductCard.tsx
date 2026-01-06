import { ShoppingCart, Star, Truck } from "lucide-react";
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
  const unitLabel = type === "marmita" ? `${quantity} unidades` : `${quantity} dias`;
  const typeLabel = type === "kit" ? "Kit Detox" : "Combo";
  const hasFreeShipping = type === "marmita" && quantity && quantity >= 14;

  // Descriptions persuasivas no estilo Slim Fit
  const getDescription = () => {
    if (description) return description;
    
    if (type === "kit") {
      return "Kit completo com sucos detox naturais e sopas funcionais. Programa alimentar para emagrecer com saúde e disposição!";
    }
    
    if (quantity === 7) {
      return "Pacote ideal para começar! 7 marmitas saudáveis de 300g. Escolha seus sabores favoritos entre carnes, frangos, massas e especiais.";
    }
    if (quantity === 14) {
      return "Pacote mais popular! 14 marmitas congeladas de 300g com frete grátis. Variedade de sabores para 2 semanas de alimentação saudável.";
    }
    if (quantity === 28) {
      return "Melhor custo-benefício! 28 marmitas de 300g para o mês todo. Maior variedade de sabores + frete grátis + economia máxima!";
    }
    
    return `Pacote com ${quantity} marmitas congeladas de 300g. Escolha seus sabores favoritos!`;
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-50">
            <span className="text-6xl">
              {type === "kit" ? "🥤" : "🍱"}
            </span>
          </div>
        )}
        
        {/* Type Badge */}
        <Badge className="absolute top-3 left-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold">
          {typeLabel}
        </Badge>

        {/* Popular Badge */}
        {popular && (
          <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs">
            <Star className="h-3 w-3 fill-current" />
            Mais vendido
          </Badge>
        )}

        {/* Free Shipping Badge */}
        {hasFreeShipping && (
          <Badge className="absolute bottom-3 left-3 bg-green-600 hover:bg-green-700 text-white gap-1 text-xs">
            <Truck className="h-3 w-3" />
            Frete Grátis
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">
          {name}
        </h3>

        {/* Description - Estilo Slim Fit (texto cinza) */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-4 flex-1">
          {getDescription()}
        </p>

        {/* Unit Price */}
        {quantity && quantity > 1 && (
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-bold text-gray-700">Valor unitário:</span>{" "}
            <span className="text-gray-900 font-bold">R$ {price.toFixed(2).replace(".", ",")}</span>
          </p>
        )}

        {/* Quantity info */}
        {unitLabel && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">
            {unitLabel}
          </p>
        )}

        {/* Price and CTA */}
        <div className="flex items-end justify-between gap-3 pt-3 border-t border-gray-200 mt-auto">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">A partir de</p>
            <p className="text-2xl font-bold text-gray-900">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </p>
          </div>
          
          <Button 
            onClick={onAdd}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
