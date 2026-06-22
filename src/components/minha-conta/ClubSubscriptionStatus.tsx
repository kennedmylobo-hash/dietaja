import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SubscriptionData {
  id: string;
  kit_name: string;
  price: number;
  status: string;
  next_due_date: string | null;
}

export default function ClubSubscriptionStatus({ email }: { email?: string | null }) {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const tenantId = useTenantId();
  const navigate = useNavigate();

  useEffect(() => {
    if (!email || !tenantId) return;
    setLoading(true);
    supabase
      .from("club_subscriptions")
      .select("id, kit_name, price, status, next_due_date")
      .eq("customer_email", email)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setSub(data);
      })
      .finally(() => setLoading(false));
  }, [email, tenantId]);

  if (loading || !sub) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 mb-6">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">ClubeDietaJa</span>
              <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
                {sub.status === "active" ? "Ativo" : sub.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{sub.kit_name} • R$ {sub.price.toFixed(2)}/mês</p>
            {sub.next_due_date && (
              <p className="text-xs text-amber-600">Próxima cobrança: {new Date(sub.next_due_date).toLocaleDateString("pt-BR")}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate("/clubedietaja")}>
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          Gerenciar
        </Button>
      </CardContent>
    </Card>
  );
}
