import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Gift, Copy, Users, Loader2, Plus, Trash2, RefreshCw } from "lucide-react";

interface Referral {
  id: string;
  tenant_id: string;
  referrer_email: string;
  referrer_name: string | null;
  code: string;
  discount_percent: number;
  discount_months: number;
  usage_limit: number;
  used_count: number;
  active: boolean;
  created_at: string;
}

const ReferralManager = () => {
  const tenantId = useTenantId();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReferral, setNewReferral] = useState({
    referrer_email: "",
    referrer_name: "",
    code: "",
    discount_percent: 10,
    discount_months: 1,
    usage_limit: 10,
  });

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewReferral(prev => ({ ...prev, code }));
  };

  const fetchReferrals = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("referrals")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (data) setReferrals(data as unknown as Referral[]);
    setLoading(false);
  };

  useEffect(() => { fetchReferrals(); }, [tenantId]);

  const handleCreate = async () => {
    if (!tenantId || !newReferral.referrer_email || !newReferral.code) {
      toast({ title: "Preencha email e código", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("referrals").insert({
      tenant_id: tenantId,
      referrer_email: newReferral.referrer_email,
      referrer_name: newReferral.referrer_name || null,
      code: newReferral.code.toUpperCase(),
      discount_percent: newReferral.discount_percent,
      discount_months: newReferral.discount_months,
      usage_limit: newReferral.usage_limit,
    });
    if (error) { toast({ title: "Erro ao criar", variant: "destructive" }); return; }
    toast({ title: "Código de indicação criado!" });
    setNewReferral({ referrer_email: "", referrer_name: "", code: "", discount_percent: 10, discount_months: 1, usage_limit: 10 });
    fetchReferrals();
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("referrals").update({ active: !active }).eq("id", id);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, active: !active } : r));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("referrals").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    setReferrals(prev => prev.filter(r => r.id !== id));
    toast({ title: "Código excluído" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Indicações</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReferrals}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo Código de Indicação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email do indicador</Label>
              <Input value={newReferral.referrer_email} onChange={e => setNewReferral(p => ({ ...p, referrer_email: e.target.value }))} placeholder="cliente@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Nome do indicador (opcional)</Label>
              <Input value={newReferral.referrer_name} onChange={e => setNewReferral(p => ({ ...p, referrer_name: e.target.value }))} placeholder="Nome" />
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input value={newReferral.code} onChange={e => setNewReferral(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="MEUCODIGO" className="uppercase font-mono" />
                <Button variant="outline" onClick={generateCode}>Gerar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Desconto %</Label>
              <Input type="number" value={newReferral.discount_percent} onChange={e => setNewReferral(p => ({ ...p, discount_percent: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Meses de desconto</Label>
              <Input type="number" value={newReferral.discount_months} onChange={e => setNewReferral(p => ({ ...p, discount_months: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Limite de usos</Label>
              <Input type="number" value={newReferral.usage_limit} onChange={e => setNewReferral(p => ({ ...p, usage_limit: Number(e.target.value) }))} />
            </div>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-1" /> Criar Código
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : referrals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum código de indicação criado.</p>
        ) : referrals.map(ref => (
          <Card key={ref.id} className={ref.active ? "" : "opacity-60"}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-sm px-3 py-1">{ref.code}</Badge>
                  <div>
                    <p className="text-sm font-medium">{ref.referrer_name || ref.referrer_email}</p>
                    <p className="text-xs text-muted-foreground">{ref.referrer_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span>{ref.discount_percent}% off</span>
                  <span className="text-muted-foreground">|</span>
                  <span>{ref.used_count}/{ref.usage_limit} usos</span>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(ref.id, ref.active)}>
                    {ref.active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(ref.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReferralManager;
