import { forwardRef } from "react";
import ProductCard from "./ProductCard";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  imageUrl?: string | null;
  popular?: boolean;
  type: "kit" | "marmita";
}

interface CategorySectionProps {
  id: string;
  title: string;
  icon?: string;
  products: Product[];
  onAddProduct: (product: Product) => void;
}

const CategorySection = forwardRef<HTMLElement, CategorySectionProps>(
  ({ id, title, icon, products, onAddProduct }, ref) => {
    if (products.length === 0) return null;

    return (
      <section ref={ref} id={id} className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-2xl">{icon}</span>}
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <span className="text-sm text-muted-foreground">
            ({products.length} {products.length === 1 ? "item" : "itens"})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              description={product.description}
              price={product.price}
              quantity={product.quantity}
              imageUrl={product.imageUrl}
              popular={product.popular}
              type={product.type}
              onAdd={() => onAddProduct(product)}
            />
          ))}
        </div>
      </section>
    );
  }
);

CategorySection.displayName = "CategorySection";

export default CategorySection;
