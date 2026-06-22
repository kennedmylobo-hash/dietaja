import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";

interface LoyaltyPointsCardProps {
  customerEmail?: string;
}

interface PointsData {
  points_earned: number;
  points_redeemed: number;
  recentTx: { type: string; points: number; description: string | null; created_at: string }[];
}

const LoyaltyPointsCard = ({ customerEmail }: LoyaltyPointsCardProps) => {
  const tenantId = useTenantId();
  const [data, setData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerEmail || !tenantId) return;
    const fetchPoints = async () => {
      setLoading(true);
      const [pointsRes, txRes] = await Promise.all([
        supabase.from("loyalty_points").select("points_earned, points_redeemed")
          .eq("tenant_id", tenantId).eq("customer_email", customerEmail).maybeSingle(),
        supabase.from("loyalty_transactions").select("type, points, description, created_at")
          .eq("tenant_id", tenantId).eq("customer_email", customerEmail)
          .order("created_at", { ascending: false }).limit(10),
      ]);
      if (pointsRes.data || txRes.data) {
        setData({
          points_earned: (pointsRes.data as any)?.points_earned ?? 0,
          points_redeemed: (pointsRes.data as any)?.points_redeemed ?? 0,
          recentTx: (txRes.data as any[]) ?? [],
        });
      }
      setLoading(false);
    };
    fetchPoints();
  }, [customerEmail, tenantId]);

  const balance = data ? data.points_earned - data.points_redeemed : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-4 h-4 text-yellow-500" />
          Programa de Pontos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">Ganhe pontos a cada pedido!</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">{balance}</div>
              <div className="text-sm text-muted-foreground">
                <p>pontos disponíveis</p>
                <p className="text-xs">{data.points_earned} ganhos • {data.points_redeemed} usados</p>
              </div>
            </div>
            {data.recentTx.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Últimas movimentações</p>
                {data.recentTx.map((tx, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span>
                      {tx.type === "earn" && "✅"} {tx.type === "redeem" && "🔄"} {tx.type === "bonus" && "🎁"} {tx.type === "expire" && "⏰"}
                      {tx.description || tx.type}
                    </span>
                    <Badge variant={tx.type === "earn" || tx.type === "bonus" ? "secondary" : "outline"}>
                      {tx.type === "earn" || tx.type === "bonus" ? "+" : "-"}{tx.points}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsCard;
