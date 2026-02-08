import { Card, CardContent } from "@/components/ui/card";
import type { PricingSettings, PackageOption } from "./PricingConfig";

interface QuoteItem {
  number: number;
  description: string;
  totalWeight: number;
  priceOverride: number | null;
}

interface FinancialSummaryProps {
  items: QuoteItem[];
  settings: PricingSettings;
  getItemPrice: (item: QuoteItem) => number;
  getItemCost: (item: QuoteItem) => number;
  formatCurrency: (v: number) => string;
}

export default function FinancialSummary({
  items,
  settings,
  getItemPrice,
  getItemCost,
  formatCurrency,
}: FinancialSummaryProps) {
  const subtotalVenda = items.reduce((sum, item) => sum + getItemPrice(item), 0);
  const subtotalCusto = items.reduce((sum, item) => sum + getItemCost(item), 0);
  const lucroPerUnit = subtotalVenda - subtotalCusto;
  const margemReal = subtotalVenda > 0 ? ((lucroPerUnit / subtotalVenda) * 100) : 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6 space-y-4">
        <h3 className="font-bold text-lg">Resumo do Orçamento</h3>

        {/* Per-meal summary */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal venda ({items.length} itens):</span>
            <span className="font-bold text-lg">{formatCurrency(subtotalVenda)}</span>
          </div>
        </div>

        {/* Admin-only financial details */}
        <div className="bg-muted/60 rounded-lg p-3 space-y-1 border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">🔒 Visão Financeira (admin)</p>
          <div className="flex justify-between text-sm">
            <span>Custo estimado/refeição:</span>
            <span className="text-destructive font-medium">{formatCurrency(subtotalCusto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Preço de venda/refeição:</span>
            <span className="font-medium">{formatCurrency(subtotalVenda)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Lucro/refeição:</span>
            <span className="text-green-600 font-bold">{formatCurrency(lucroPerUnit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Margem real:</span>
            <span className="font-bold">{margemReal.toFixed(1)}%</span>
          </div>
        </div>

        {/* Packages */}
        <div className="border-t pt-4 space-y-2">
          <p className="font-semibold text-sm text-muted-foreground mb-2">Pacotes:</p>
          {settings.packageOptions.map((pkg) => {
            const vendaTotal = subtotalVenda * items.length * pkg.days * (1 - pkg.discount);
            const custoTotal = subtotalCusto * items.length * pkg.days;
            const lucroTotal = vendaTotal - custoTotal;
            return (
              <div key={`${pkg.days}-${pkg.label}`} className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    Kit {pkg.label} ({pkg.days}x cada)
                    {pkg.discount > 0 && (
                      <span className="text-primary ml-1 text-xs">-{Math.round(pkg.discount * 100)}%</span>
                    )}
                  </span>
                  <span className="font-semibold">{formatCurrency(vendaTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pl-2">
                  <span>Custo: {formatCurrency(custoTotal)}</span>
                  <span className="text-green-600">Lucro: {formatCurrency(lucroTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
