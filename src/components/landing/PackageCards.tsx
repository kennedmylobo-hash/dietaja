import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Star } from "lucide-react";

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  quantity: number;
  pricePerUnit: number;
  popular?: boolean;
  description?: string;
}

interface PackageCardsProps {
  title: string;
  subtitle?: string;
  packages: PackageOption[];
  onSelect: (pkg: PackageOption) => void;
  accentColor?: 'primary' | 'terracotta' | 'blue';
  loadingId: string | null;
  unit?: string;
  minFlavorUnitPrice?: number;
}

const PackageCards = ({
  title,
  subtitle,
  packages,
  onSelect,
  accentColor = 'primary',
  loadingId,
  unit = "un",
  minFlavorUnitPrice,
}: PackageCardsProps) => {
  const colorClasses = {
    primary: {
      badge: "bg-primary text-primary-foreground",
      border: "border-primary",
      button: "bg-primary hover:bg-primary/90",
    },
    terracotta: {
      badge: "bg-terracotta text-white",
      border: "border-terracotta",
      button: "bg-terracotta hover:bg-terracotta/90 text-white",
    },
    blue: {
      badge: "bg-blue-500 text-white",
      border: "border-blue-500",
      button: "bg-blue-500 hover:bg-blue-600 text-white",
    },
  };

  const colors = colorClasses[accentColor];

  // Find the best value (lowest price per unit)
  const bestValueId = packages.reduce((best, pkg) => 
    pkg.pricePerUnit < (packages.find(p => p.id === best)?.pricePerUnit || Infinity)
      ? pkg.id
      : best
  , packages[0]?.id);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className={`grid sm:grid-cols-2 gap-4 ${
          packages.length === 3 
            ? 'lg:grid-cols-3 max-w-4xl mx-auto' 
            : 'lg:grid-cols-4'
        }`}>
          {packages.map((pkg, index) => {
            const isPopular = pkg.popular || pkg.id === bestValueId;
            const isLoading = loadingId === pkg.id;

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card 
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    isPopular ? `${colors.border} border-2 shadow-md` : ''
                  }`}
                >
                  {isPopular && (
                    <div className={`absolute top-0 right-0 ${colors.badge} px-3 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1`}>
                      <Star className="w-3 h-3 fill-current" />
                      Melhor custo
                    </div>
                  )}

                  <CardContent className="p-5 pt-8">
                    <div className="text-center space-y-3">
                      <h3 className="font-bold text-lg text-foreground">
                        {pkg.name}
                      </h3>

                      {pkg.description && (
                        <p className="text-sm text-muted-foreground">
                          {pkg.description}
                        </p>
                      )}

                      <div className="py-2">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-sm text-muted-foreground">R$</span>
                          <span className="text-3xl font-bold text-foreground">
                            {pkg.pricePerUnit.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-sm text-muted-foreground">/{unit}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          A partir de R$ {(pkg.quantity * Math.min(pkg.pricePerUnit, minFlavorUnitPrice ?? pkg.pricePerUnit)).toFixed(2).replace('.', ',')}
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        {pkg.quantity} {pkg.quantity === 1 ? 'unidade' : 'unidades'}
                      </div>

                      <Button
                        onClick={() => onSelect(pkg)}
                        disabled={isLoading}
                        className={`w-full ${colors.button}`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Carregando...
                          </>
                        ) : (
                          'Escolher sabores'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PackageCards;
