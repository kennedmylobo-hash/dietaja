import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Store, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Tenant {
  id: string;
  brand_name: string;
  slug: string;
  plan_type: string;
  plan_price: number;
  plan_status: string;
  plan_due_date: string | null;
  is_active: boolean;
}

export default function SABilling() {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const fetchTenants = async () => {
    const { data } = await supabase.from("tenants").select("id, brand_name, slug, plan_type, plan_price, plan_status, plan_due_date, is_active").order("brand_name");
    setTenants(data || []);
  };

  useEffect(() => { fetchTenants(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tenants").update({ plan_status: status }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      fetchTenants();
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "overdue": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "cancelled": return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const totalRevenue = tenants.filter(t => t.plan_status === "active").reduce((s, t) => s + Number(t.plan_price), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cobranças</h1>
        <Badge variant="outline" className="text-lg px-4 py-1">
          Receita: R$ {totalRevenue.toFixed(2).replace(".", ",")}
        </Badge>
      </div>

      <div className="space-y-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {statusIcon(tenant.plan_status)}
                <div>
                  <p className="font-semibold">{tenant.brand_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.plan_type} • R$ {Number(tenant.plan_price).toFixed(2).replace(".", ",")}
                    {tenant.plan_due_date && ` • Vence: ${new Date(tenant.plan_due_date).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>

              <Select value={tenant.plan_status} onValueChange={(v) => updateStatus(tenant.id, v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">✅ Ativo</SelectItem>
                  <SelectItem value="overdue">⚠️ Inadimplente</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelado</SelectItem>
                  <SelectItem value="trial">🔵 Trial</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
