import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Star, Users, Loader2, Plus, Trash2, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClubPlan {
  id: string;
  name: string;
  kit_type: string;
  description: string | null;
  items_description: string | null;
  price: number;
  active: boolean;
  popular: boolean;
  sort_order: number;
  icon_emoji: string | null;
}

interface ClubSubscription {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  kit_name: string;
  price: number;
  status: string;
  next_due_date: string | null;
  created_at: string;
  delivery_option: string;
}

export default function ClubManager() {
  const tenantId = useTenantId();
  const [plans, setPlans] = useState<ClubPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<ClubSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", kit_type: "", price: 0, description: "", items_description: "", icon_emoji: "📦" });

  // Benefits state
  const [benefits, setBenefits] = useState<any[]>([]);
  const [newBenefit, setNewBenefit] = useState({ name: "", description: "", min_months: 3, benefit_type: "discount", benefit_value: 10, plan_id: "" });

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;
    setLoading(true);
    const [plansRes, subsRes, benefitsRes] = await Promise.all([
      supabase.from("club_plans").select("*").eq("tenant_id", tenantId).order("sort_order"),
      supabase.from("club_subscriptions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50),
      supabase.from("club_benefits").select("*, club_plans(name)").eq("tenant_id", tenantId).order("min_months"),
    ]);
    if (plansRes.data) setPlans(plansRes.data);
    if (subsRes.data) setSubscriptions(subsRes.data);
    if (benefitsRes.data) setBenefits(benefitsRes.data);
    setLoading(false);
  };

  const updatePlan = (id: string, field: string, value: any) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const savePlans = async () => {
    setSaving(true);
    try {
      for (const plan of plans) {
        const { error } = await supabase.from("club_plans").update({
          name: plan.name,
          description: plan.description,
          items_description: plan.items_description,
          price: plan.price,
          active: plan.active,
          popular: plan.popular,
          sort_order: plan.sort_order,
          icon_emoji: plan.icon_emoji,
        }).eq("id", plan.id);
        if (error) throw error;
      }
      toast({ title: "Planos salvos!" });
    } catch (err) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addPlan = async () => {
    if (!newPlan.name || !newPlan.kit_type || !newPlan.price) return;
    const { data, error } = await supabase.from("club_plans").insert({
      tenant_id: tenantId,
      name: newPlan.name,
      kit_type: newPlan.kit_type,
      description: newPlan.description || null,
      items_description: newPlan.items_description || null,
      price: newPlan.price,
      icon_emoji: newPlan.icon_emoji || null,
      sort_order: plans.length,
    }).select().single();
    if (error) {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
      return;
    }
    setPlans((prev) => [...prev, data]);
    setNewPlan({ name: "", kit_type: "", price: 0, description: "", items_description: "", icon_emoji: "📦" });
    toast({ title: "Plano criado!" });
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    const { error } = await supabase.from("club_plans").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Plano excluído" });
  };

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <Tabs defaultValue="plans">
      <TabsList>
        <TabsTrigger value="plans" className="flex items-center gap-2">
          <Star className="w-4 h-4" /> Planos
        </TabsTrigger>
        <TabsTrigger value="benefits" className="flex items-center gap-2">
          <Award className="w-4 h-4" /> Benefícios Progressivos
        </TabsTrigger>
        <TabsTrigger value="subscriptions" className="flex items-center gap-2">
          <Users className="w-4 h-4" /> Assinaturas ({subscriptions.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="plans" className="space-y-4 mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Planos do Clube</CardTitle>
            <Button onClick={savePlans} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {plans.map((plan) => (
                <div key={plan.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2">
                    <Input
                      value={plan.icon_emoji || ""}
                      onChange={(e) => updatePlan(plan.id, "icon_emoji", e.target.value)}
                      className="w-12 h-8 text-center"
                    />
                    <Input value={plan.name} onChange={(e) => updatePlan(plan.id, "name", e.target.value)} className="flex-1 h-8" />
                    <Input
                      type="number" step="0.01"
                      value={plan.price}
                      onChange={(e) => updatePlan(plan.id, "price", parseFloat(e.target.value))}
                      className="w-24 h-8 text-center"
                    />
                    <div className="flex items-center gap-1">
                      <Switch checked={plan.active} onCheckedChange={(c) => updatePlan(plan.id, "active", c)} />
                      <span className="text-xs text-muted-foreground">Ativo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={plan.popular} onCheckedChange={(c) => updatePlan(plan.id, "popular", c)} />
                      <span className="text-xs text-muted-foreground">Popular</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePlan(plan.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Tipo (kit_type)</Label>
                      <Input value={plan.kit_type} onChange={(e) => updatePlan(plan.id, "kit_type", e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Descrição itens</Label>
                      <Input value={plan.items_description || ""} onChange={(e) => updatePlan(plan.id, "items_description", e.target.value)} className="h-7 text-xs" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <Input value={plan.description || ""} onChange={(e) => updatePlan(plan.id, "description", e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-end gap-2 p-3 rounded-lg border border-dashed">
              <div className="flex-1">
                <Label className="text-xs">Nome</Label>
                <Input value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="Novo plano" className="h-8" />
              </div>
              <div className="w-28">
                <Label className="text-xs">Tipo</Label>
                <Input value={newPlan.kit_type} onChange={(e) => setNewPlan({ ...newPlan, kit_type: e.target.value })} placeholder="kit_type" className="h-8" />
              </div>
              <div className="w-20">
                <Label className="text-xs">Preço</Label>
                <Input type="number" step="0.01" value={newPlan.price || ""} onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })} className="h-8" />
              </div>
              <Button onClick={addPlan} size="sm"><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Benefits Tab */}
      <TabsContent value="benefits" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Benefícios Progressivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Benefícios automáticos conforme o tempo de assinatura do cliente.</p>
            {benefits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum benefício configurado.</p>
            ) : (
              <div className="space-y-2">
                {benefits.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{b.name}</span>
                        <Badge variant="outline" className="text-[10px]">{b.min_months}+ meses</Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {b.benefit_type === 'discount' && `${b.benefit_value}% off`}
                          {b.benefit_type === 'free_shipping' && 'Frete grátis'}
                          {b.benefit_type === 'free_item' && 'Item grátis'}
                          {b.benefit_type === 'upgrade' && 'Upgrade'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{b.description} {b.club_plans?.name && `• Plano: ${b.club_plans.name}`}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                      await supabase.from("club_benefits").delete().eq("id", b.id);
                      setBenefits(prev => prev.filter((x: any) => x.id !== b.id));
                      toast({ title: "Benefício excluído" });
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 rounded-lg border border-dashed space-y-3">
              <p className="text-xs font-medium">Novo benefício</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={newBenefit.name} onChange={e => setNewBenefit(p => ({ ...p, name: e.target.value }))} placeholder="Frete grátis" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Meses mínimos</Label>
                  <Input type="number" value={newBenefit.min_months} onChange={e => setNewBenefit(p => ({ ...p, min_months: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <select value={newBenefit.benefit_type} onChange={e => setNewBenefit(p => ({ ...p, benefit_type: e.target.value }))}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs">
                    <option value="discount">Desconto %</option>
                    <option value="free_shipping">Frete grátis</option>
                    <option value="free_item">Item grátis</option>
                    <option value="upgrade">Upgrade</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Valor (desconto %)</Label>
                  <Input type="number" value={newBenefit.benefit_value} onChange={e => setNewBenefit(p => ({ ...p, benefit_value: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Plano (opcional)</Label>
                  <select value={newBenefit.plan_id} onChange={e => setNewBenefit(p => ({ ...p, plan_id: e.target.value }))}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs">
                    <option value="">Todos os planos</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input value={newBenefit.description} onChange={e => setNewBenefit(p => ({ ...p, description: e.target.value }))} placeholder="Frete grátis para assinantes com 3+ meses" className="h-8 text-xs" />
              </div>
              <Button size="sm" onClick={async () => {
                if (!newBenefit.name) { toast({ title: "Preencha o nome", variant: "destructive" }); return; }
                const { data, error } = await supabase.from("club_benefits").insert({
                  tenant_id: tenantId, name: newBenefit.name,
                  description: newBenefit.description || null,
                  min_months: newBenefit.min_months, benefit_type: newBenefit.benefit_type,
                  benefit_value: newBenefit.benefit_value, plan_id: newBenefit.plan_id || null,
                }).select().single();
                if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
                setBenefits((prev: any) => [...prev, data]);
                setNewBenefit({ name: "", description: "", min_months: 3, benefit_type: "discount", benefit_value: 10, plan_id: "" });
                toast({ title: "Benefício criado!" });
              }}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subscriptions" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assinaturas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada.</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sub.customer_name}</span>
                        <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {sub.status === "active" ? "Ativa" : sub.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{sub.kit_name} • R$ {sub.price.toFixed(2)}/mês</p>
                      <p className="text-xs text-muted-foreground">{sub.customer_email} • {sub.customer_phone}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {sub.next_due_date && <p>Próximo: {new Date(sub.next_due_date).toLocaleDateString("pt-BR")}</p>}
                      <p>Desde {new Date(sub.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
