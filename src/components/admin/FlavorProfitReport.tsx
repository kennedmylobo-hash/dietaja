import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrderCostCalculator, calculateOrderCost } from "@/hooks/useOrderCostCalculator";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FlavorProfitReportProps {
  dateFilter: "today" | "week" | "month";
}

interface FlavorStats {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

const FlavorProfitReport = ({ dateFilter }: FlavorProfitReportProps) => {
  const { settings: pricingSettings, loaded: pricingLoaded } = useOrderCostCalculator();

  const getDateRange = (filter: string) => {
    const now = new Date();
    const start = new Date();
    switch (filter) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start.setDate(now.getDate() - 30);
        break;
    }
    return start.toISOString();
  };

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["flavor-profit-orders", dateFilter],
    queryFn: async () => {
      const start = getDateRange(dateFilter);
      const { data, error } = await supabase
        .from("orders")
        .select("items, total, status")
        .gte("created_at", start)
        .not("status", "in", '("cancelled","pending")');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: flavorSidesMap } = useQuery({
    queryKey: ["flavor-profit-sides"],
    queryFn: async () => {
      const { data } = await supabase.from("marmita_flavors").select("name, sides");
      const map: Record<string, Json | null> = {};
      data?.forEach((f) => { map[f.name] = f.sides; });
      return map;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["flavor-profit-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("marmita_packages").select("quantity, unit_price, line_type");
      return data || [];
    },
  });

  const flavorStats = useMemo(() => {
    if (!orders || !flavorSidesMap || !pricingLoaded) return [];

    const stats: Record<string, FlavorStats> = {};

    // Helper to get unit price for a flavor based on line type
    const getUnitPrice = (lineType: string, _quantity: number) => {
      // Find matching package to get unit price
      const pkg = packages?.find(p => (p.line_type || "fit") === lineType);
      return pkg?.unit_price || 0;
    };

    const { getCostPerGram } = (() => {
      const fn = (costPerKg: number, cookingLoss: number) => {
        const fc = cookingLoss >= 100 ? 1 : 1 / (1 - cookingLoss / 100);
        return (costPerKg / 1000) * fc;
      };
      return { getCostPerGram: fn };
    })();

    const protCost = getCostPerGram(pricingSettings.proteinPricing.costPerKg, pricingSettings.proteinPricing.cookingLossPercent);
    const carbCost = getCostPerGram(pricingSettings.carbPricing.costPerKg, pricingSettings.carbPricing.cookingLossPercent);
    const veggieCost = getCostPerGram(pricingSettings.veggiePricing.costPerKg, pricingSettings.veggiePricing.cookingLossPercent);

    const PROTEIN_KEYWORDS = [
      "carne", "bovina", "bovino", "frango", "peixe", "tilápia", "tilapia", "salmão",
      "camarão", "ovo", "atum", "hambúrguer", "hamburguer", "strogonoff", "filé", "file",
      "linguiça", "linguica", "costela", "porco", "suíno", "suino", "picanha", "alcatra",
      "grão de bico", "grao de bico", "lentilha", "tofu", "proteína", "proteina",
      "empanado", "grelhado", "desfiado", "moída", "moida",
    ];
    const VEGGIE_KEYWORDS = [
      "legume", "legumes", "brócolis", "brocolis", "cenoura", "abobrinha", "abóbora",
      "vagem", "espinafre", "couve", "berinjela", "salada", "mix", "variado",
      "beterraba", "chuchu", "quiabo",
    ];

    function classifySide(name: string) {
      const lower = name.toLowerCase();
      for (const kw of PROTEIN_KEYWORDS) if (lower.includes(kw)) return "protein";
      for (const kw of VEGGIE_KEYWORDS) if (lower.includes(kw)) return "veggie";
      return "carb";
    }

    orders.forEach((order) => {
      const items = order.items as any[];
      if (!Array.isArray(items)) return;

      items.forEach((item) => {
        if (item.type !== "marmita" || !item.flavors?.length) return;

        const lineType = item.lineType === "hipertrofia" || item.lineType === "fitness"
          || /hipertrofia|fitness/i.test(item.name)
          ? "fitness" : "fit";

        // Per-unit revenue for this item
        const totalQty = item.flavors.reduce((s: number, f: any) => s + (f.quantity || 1), 0);
        const unitRevenue = totalQty > 0 ? (item.totalPrice || 0) / totalQty : 0;

        for (const flavor of item.flavors) {
          const flavorName = flavor.name;
          const qty = flavor.quantity || 1;

          if (!stats[flavorName]) {
            stats[flavorName] = { name: flavorName, quantity: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
          }

          stats[flavorName].quantity += qty;
          stats[flavorName].revenue += unitRevenue * qty;

          // Calculate cost from sides composition
          const sidesData = findSides(flavorName, flavorSidesMap);
          if (sidesData) {
            const sides = (sidesData as any)?.[lineType] as { name: string; weight: number }[] | undefined;
            if (sides?.length) {
              let flavorCost = 0;
              for (const side of sides) {
                const cat = classifySide(side.name);
                const cpg = cat === "protein" ? protCost : cat === "veggie" ? veggieCost : carbCost;
                flavorCost += side.weight * cpg;
              }
              flavorCost += pricingSettings.packagingCost + pricingSettings.fixedCostPerMeal;
              stats[flavorName].cost += flavorCost * qty;
            }
          }
        }
      });
    });

    // Calculate profit & margin
    return Object.values(stats)
      .map((s) => {
        s.profit = s.revenue - s.cost;
        s.margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
        return s;
      })
      .sort((a, b) => b.profit - a.profit);
  }, [orders, flavorSidesMap, pricingLoaded, pricingSettings, packages]);

  const isLoading = ordersLoading || !pricingLoaded;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flavorStats.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado de sabores encontrado no período.
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return "text-green-600";
    if (margin >= 30) return "text-amber-600";
    return "text-red-600";
  };

  const getMarginBadge = (margin: number) => {
    if (margin >= 50) return <Badge variant="default" className="bg-green-600 text-xs">Ótima</Badge>;
    if (margin >= 30) return <Badge variant="default" className="bg-amber-500 text-xs">OK</Badge>;
    return <Badge variant="destructive" className="text-xs">Baixa</Badge>;
  };

  const topProfit = flavorStats.slice(0, 3);
  const worstProfit = [...flavorStats].sort((a, b) => a.profit - b.profit).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              Mais Lucrativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProfit.map((f, i) => (
              <div key={f.name} className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="font-bold text-green-700 dark:text-green-400 mr-1">#{i + 1}</span>
                  {f.name}
                </span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(f.profit)} ({f.margin.toFixed(0)}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
              <TrendingDown className="h-4 w-4" />
              Menos Lucrativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {worstProfit.map((f, i) => (
              <div key={f.name} className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="font-bold text-red-700 dark:text-red-400 mr-1">#{i + 1}</span>
                  {f.name}
                </span>
                <span className={`text-sm font-semibold ${f.profit >= 0 ? "text-amber-600" : "text-red-700 dark:text-red-400"}`}>
                  {formatCurrency(f.profit)} ({f.margin.toFixed(0)}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Full table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lucratividade por Sabor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sabor</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flavorStats.map((f) => (
                  <TableRow key={f.name}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-right">{f.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(f.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(f.cost)}</TableCell>
                    <TableCell className={`text-right font-semibold ${f.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(f.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-semibold ${getMarginColor(f.margin)}`}>
                          {f.margin.toFixed(1)}%
                        </span>
                        {getMarginBadge(f.margin)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Fuzzy match flavor name to sides data
function findSides(flavorName: string, map: Record<string, Json | null>): Json | null {
  if (map[flavorName]) return map[flavorName];
  const stopWords = new Set(["com", "de", "e", "em", "ao", "a", "o", "mix", "da", "do"]);
  const extractWords = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[\s,]+/).filter(w => w.length > 1 && !stopWords.has(w));
  const targetWords = extractWords(flavorName);
  let bestMatch = "";
  let bestScore = 0;
  for (const key of Object.keys(map)) {
    const keyWords = extractWords(key);
    const overlap = targetWords.filter(w => keyWords.includes(w)).length;
    const score = overlap / Math.max(targetWords.length, keyWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = key;
    }
  }
  return bestMatch ? map[bestMatch] : null;
}

export default FlavorProfitReport;
