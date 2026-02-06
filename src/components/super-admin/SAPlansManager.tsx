import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Pencil, Plus } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  features: string[];
  max_products: number | null;
  max_orders_month: number | null;
  active: boolean;
  sort_order: number;
}

const emptyPlan = {
  name: "",
  slug: "",
  price: 0,
  features: "",
  max_products: "",
  max_orders_month: "",
  active: true,
};

export default function SAPlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPlan);

  const fetchPlans = async () => {
    const { data } = await supabase.from("platform_plans").select("*").order("sort_order");
    setPlans((data || []).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] })));
  };

  useEffect(() => { fetchPlans(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyPlan);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      features: plan.features.join(", "),
      max_products: plan.max_products?.toString() || "",
      max_orders_month: plan.max_orders_month?.toString() || "",
      active: plan.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const featuresArr = form.features.split(",").map((f: string) => f.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      slug: form.slug,
      price: Number(form.price),
      features: featuresArr,
      max_products: form.max_products ? Number(form.max_products) : null,
      max_orders_month: form.max_orders_month ? Number(form.max_orders_month) : null,
      active: form.active,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("platform_plans").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("platform_plans").insert(payload));
    }

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo!" });
      setDialogOpen(false);
      fetchPlans();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planos da Plataforma</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.active ? "opacity-60" : ""}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <Badge variant={plan.active ? "default" : "secondary"}>
                  {plan.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="text-3xl font-bold">
                R$ {Number(plan.price).toFixed(2).replace(".", ",")}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="space-y-1 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              {plan.max_products && (
                <p className="text-xs text-muted-foreground">Máx. {plan.max_products} produtos</p>
              )}
              {plan.max_orders_month && (
                <p className="text-xs text-muted-foreground">Máx. {plan.max_orders_month} pedidos/mês</p>
              )}
              <Button variant="outline" size="sm" onClick={() => openEdit(plan)} className="w-full">
                <Pencil className="h-3 w-3 mr-2" /> Editar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editingId} /></div>
            </div>
            <div><Label>Preço (R$)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            <div><Label>Funcionalidades (separadas por vírgula)</Label><Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Máx. Produtos</Label><Input type="number" value={form.max_products} onChange={(e) => setForm({ ...form, max_products: e.target.value })} placeholder="Ilimitado" /></div>
              <div><Label>Máx. Pedidos/Mês</Label><Input type="number" value={form.max_orders_month} onChange={(e) => setForm({ ...form, max_orders_month: e.target.value })} placeholder="Ilimitado" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Plano ativo</Label>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
