import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, ShoppingCart, TrendingUp, DollarSign, Repeat, BarChart3 } from "lucide-react";

interface ABTest {
  id: string;
  name: string;
  target_section: string;
  variant_a_value: string;
  variant_b_value: string;
  status: string;
  traffic_split: number;
  winner: string | null;
  created_at: string;
  ended_at: string | null;
}

interface VariantStats {
  visitors: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  avgTicket: number;
  retentionRate: number;
}

// Z-test for two proportions
function calculateConfidence(nA: number, cA: number, nB: number, cB: number): number {
  if (nA < 10 || nB < 10) return 0;
  const pA = cA / nA;
  const pB = cB / nB;
  const pPool = (cA + cB) / (nA + nB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
  if (se === 0) return 0;
  const z = Math.abs(pB - pA) / se;
  // Approximate normal CDF
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.round((1 - 2 * p) * 100);
}

export default function ABTestReport({ test }: { test: ABTest }) {
  const tenantId = useTenantId();

  // Fetch analytics events for this test
  const { data: events } = useQuery({
    queryKey: ["ab-report-events", test.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("session_id, metadata")
        .eq("tenant_id", tenantId)
        .eq("event_type", "ab_variant_assigned")
        .not("metadata", "is", null);
      return data || [];
    },
  });

  // Fetch orders
  const { data: orders } = useQuery({
    queryKey: ["ab-report-orders", test.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, customer_email, total, utm_data, status")
        .eq("tenant_id", tenantId)
        .in("status", ["paid", "preparing", "ready", "delivered"]);
      return data || [];
    },
  });

  const stats = useMemo(() => {
    if (!events || !orders) return null;

    // Filter events for this test
    const testEvents = events.filter((e: any) => {
      const meta = e.metadata as any;
      return meta?.test_id === test.id;
    });

    const sessionsA = new Set<string>();
    const sessionsB = new Set<string>();

    testEvents.forEach((e: any) => {
      const meta = e.metadata as any;
      if (meta?.variant === "a") sessionsA.add(e.session_id);
      else if (meta?.variant === "b") sessionsB.add(e.session_id);
    });

    // Filter orders that have ab data
    const ordersWithAB = orders.filter((o: any) => {
      const utm = o.utm_data as any;
      return utm?.ab_test_id === test.id;
    });

    const ordersA = ordersWithAB.filter((o: any) => (o.utm_data as any)?.ab_variant === "a");
    const ordersB = ordersWithAB.filter((o: any) => (o.utm_data as any)?.ab_variant === "b");

    const revenueA = ordersA.reduce((s: number, o: any) => s + Number(o.total), 0);
    const revenueB = ordersB.reduce((s: number, o: any) => s + Number(o.total), 0);

    // Retention: customers with 2+ orders
    const countRetention = (orderList: any[]) => {
      const emailCounts: Record<string, number> = {};
      orderList.forEach((o) => { emailCounts[o.customer_email] = (emailCounts[o.customer_email] || 0) + 1; });
      const unique = Object.keys(emailCounts).length;
      const returning = Object.values(emailCounts).filter((c) => c >= 2).length;
      return unique > 0 ? (returning / unique) * 100 : 0;
    };

    const a: VariantStats = {
      visitors: sessionsA.size,
      orders: ordersA.length,
      revenue: revenueA,
      conversionRate: sessionsA.size > 0 ? (ordersA.length / sessionsA.size) * 100 : 0,
      avgTicket: ordersA.length > 0 ? revenueA / ordersA.length : 0,
      retentionRate: countRetention(ordersA),
    };

    const b: VariantStats = {
      visitors: sessionsB.size,
      orders: ordersB.length,
      revenue: revenueB,
      conversionRate: sessionsB.size > 0 ? (ordersB.length / sessionsB.size) * 100 : 0,
      avgTicket: ordersB.length > 0 ? revenueB / ordersB.length : 0,
      retentionRate: countRetention(ordersB),
    };

    const confidence = calculateConfidence(a.visitors, a.orders, b.visitors, b.orders);

    return { a, b, confidence };
  }, [events, orders, test.id]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const pctDiff = (a: number, b: number) => {
    if (a === 0) return b > 0 ? "+∞" : "0%";
    const diff = ((b - a) / a) * 100;
    return `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`;
  };

  if (!stats) return <div className="text-muted-foreground">Carregando relatório...</div>;

  const metrics = [
    { icon: Users, label: "Visitantes", a: stats.a.visitors.toString(), b: stats.b.visitors.toString(), diff: pctDiff(stats.a.visitors, stats.b.visitors), better: stats.b.visitors > stats.a.visitors ? "b" : stats.a.visitors > stats.b.visitors ? "a" : null },
    { icon: ShoppingCart, label: "Pedidos", a: stats.a.orders.toString(), b: stats.b.orders.toString(), diff: pctDiff(stats.a.orders, stats.b.orders), better: stats.b.orders > stats.a.orders ? "b" : stats.a.orders > stats.b.orders ? "a" : null },
    { icon: TrendingUp, label: "Conversão", a: `${stats.a.conversionRate.toFixed(1)}%`, b: `${stats.b.conversionRate.toFixed(1)}%`, diff: pctDiff(stats.a.conversionRate, stats.b.conversionRate), better: stats.b.conversionRate > stats.a.conversionRate ? "b" : stats.a.conversionRate > stats.b.conversionRate ? "a" : null },
    { icon: DollarSign, label: "Receita", a: formatCurrency(stats.a.revenue), b: formatCurrency(stats.b.revenue), diff: pctDiff(stats.a.revenue, stats.b.revenue), better: stats.b.revenue > stats.a.revenue ? "b" : stats.a.revenue > stats.b.revenue ? "a" : null },
    { icon: BarChart3, label: "Ticket Médio", a: formatCurrency(stats.a.avgTicket), b: formatCurrency(stats.b.avgTicket), diff: pctDiff(stats.a.avgTicket, stats.b.avgTicket), better: stats.b.avgTicket > stats.a.avgTicket ? "b" : stats.a.avgTicket > stats.b.avgTicket ? "a" : null },
    { icon: Repeat, label: "Retenção", a: `${stats.a.retentionRate.toFixed(0)}%`, b: `${stats.b.retentionRate.toFixed(0)}%`, diff: pctDiff(stats.a.retentionRate, stats.b.retentionRate), better: stats.b.retentionRate > stats.a.retentionRate ? "b" : stats.a.retentionRate > stats.b.retentionRate ? "a" : null },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Relatório: {test.name}
          </CardTitle>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>A: "{test.variant_a_value.substring(0, 60)}"</span>
            <span>•</span>
            <span>B: "{test.variant_b_value.substring(0, 60)}"</span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Confidence */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Confiança estatística</p>
              <p className="text-xs text-muted-foreground">Mínimo 95% para resultado confiável</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${stats.confidence >= 95 ? "text-green-600" : stats.confidence >= 80 ? "text-amber-500" : "text-muted-foreground"}`}>
                {stats.confidence}%
              </span>
              {stats.confidence >= 95 && (
                <Badge className="ml-2 bg-green-600">Significativo</Badge>
              )}
            </div>
          </div>

          {/* Metrics table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Métrica</th>
                  <th className="text-center py-3 px-2 font-medium">Variante A</th>
                  <th className="text-center py-3 px-2 font-medium">Variante B</th>
                  <th className="text-center py-3 px-2 font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const Icon = m.icon;
                  return (
                    <tr key={m.label} className="border-b last:border-0">
                      <td className="py-3 px-2 flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {m.label}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={m.better === "a" ? "font-bold text-green-600" : ""}>
                          {m.a}
                        </span>
                        {m.better === "a" && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1 border-green-500 text-green-600">Ganhando</Badge>}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={m.better === "b" ? "font-bold text-green-600" : ""}>
                          {m.b}
                        </span>
                        {m.better === "b" && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1 border-green-500 text-green-600">Ganhando</Badge>}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={m.diff.startsWith("+") ? "text-green-600" : m.diff.startsWith("-") ? "text-red-500" : ""}>
                          {m.diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
