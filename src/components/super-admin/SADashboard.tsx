import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, DollarSign, Users, AlertTriangle } from "lucide-react";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  overdueCount: number;
  monthlyRevenue: number;
}

export default function SADashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTenants: 0,
    activeTenants: 0,
    overdueCount: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: tenants } = await supabase.from("tenants").select("*");
      if (!tenants) return;

      const active = tenants.filter((t) => t.plan_status === "active" && t.is_active);
      const overdue = tenants.filter((t) => t.plan_status === "overdue");
      const revenue = tenants.reduce((sum, t) => sum + Number(t.plan_price || 0), 0);

      setStats({
        totalTenants: tenants.length,
        activeTenants: active.length,
        overdueCount: overdue.length,
        monthlyRevenue: revenue,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Restaurantes", value: stats.totalTenants, icon: Store, color: "text-blue-500" },
    { title: "Ativos", value: stats.activeTenants, icon: Users, color: "text-green-500" },
    { title: "Inadimplentes", value: stats.overdueCount, icon: AlertTriangle, color: "text-red-500" },
    {
      title: "Receita Mensal",
      value: `R$ ${stats.monthlyRevenue.toFixed(2).replace(".", ",")}`,
      icon: DollarSign,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard da Plataforma</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
