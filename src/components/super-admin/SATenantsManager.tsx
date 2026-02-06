import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, Globe, Store } from "lucide-react";

interface Tenant {
  id: string;
  slug: string;
  domain: string | null;
  brand_name: string;
  brand_slogan: string;
  logo_url: string | null;
  primary_color: string;
  city: string;
  state: string;
  whatsapp: string;
  whatsapp_formatted: string;
  delivery_fee: number;
  pickup_neighborhood: string;
  plan_type: string;
  plan_status: string;
  plan_price: number;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  brand_name: "",
  slug: "",
  domain: "",
  brand_slogan: "",
  primary_color: "#22c55e",
  city: "",
  state: "",
  whatsapp: "",
  whatsapp_formatted: "",
  delivery_fee: 0,
  pickup_neighborhood: "",
  plan_type: "basico",
  plan_price: 99,
  plan_status: "active",
};

export default function SATenantsManager() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTenants = async () => {
    const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    setTenants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const openEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setForm({
      brand_name: tenant.brand_name,
      slug: tenant.slug,
      domain: tenant.domain || "",
      brand_slogan: tenant.brand_slogan,
      primary_color: tenant.primary_color,
      city: tenant.city,
      state: tenant.state,
      whatsapp: tenant.whatsapp,
      whatsapp_formatted: tenant.whatsapp_formatted,
      delivery_fee: Number(tenant.delivery_fee),
      pickup_neighborhood: tenant.pickup_neighborhood,
      plan_type: tenant.plan_type,
      plan_price: Number(tenant.plan_price),
      plan_status: tenant.plan_status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingTenant) return;

    const { error } = await supabase
      .from("tenants")
      .update({
        brand_name: form.brand_name,
        brand_slogan: form.brand_slogan,
        domain: form.domain || null,
        primary_color: form.primary_color,
        city: form.city,
        state: form.state,
        whatsapp: form.whatsapp,
        whatsapp_formatted: form.whatsapp_formatted,
        delivery_fee: form.delivery_fee,
        pickup_neighborhood: form.pickup_neighborhood,
        plan_type: form.plan_type,
        plan_price: form.plan_price,
        plan_status: form.plan_status,
      })
      .eq("id", editingTenant.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Restaurante atualizado com sucesso." });
      setDialogOpen(false);
      fetchTenants();
    }
  };

  const toggleActive = async (tenant: Tenant) => {
    await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id);
    fetchTenants();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "overdue": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      case "trial": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Restaurantes</h1>
        <Badge variant="outline">{tenants.length} total</Badge>
      </div>

      <div className="grid gap-4">
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: tenant.primary_color + "20" }}
                >
                  <Store className="h-5 w-5" style={{ color: tenant.primary_color }} />
                </div>
                <div>
                  <p className="font-semibold">{tenant.brand_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tenant.slug}</span>
                    {tenant.domain && (
                      <>
                        <Globe className="h-3 w-3" />
                        <span>{tenant.domain}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{tenant.city}/{tenant.state}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={statusColor(tenant.plan_status)}>
                  {tenant.plan_status}
                </Badge>
                <Badge variant="outline">{tenant.plan_type}</Badge>
                <span className="text-sm font-medium">
                  R$ {Number(tenant.plan_price).toFixed(2).replace(".", ",")}
                </span>
                <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleActive(tenant)}
                  className={tenant.is_active ? "text-green-600" : "text-red-600"}
                >
                  {tenant.is_active ? "✓" : "✗"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Restaurante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Marca</Label>
                <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} disabled className="bg-muted" />
              </div>
            </div>
            <div>
              <Label>Domínio Próprio</Label>
              <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="restaurante.com.br" />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input value={form.brand_slogan} onChange={(e) => setForm({ ...form, brand_slogan: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor Primária</Label>
                <div className="flex gap-2">
                  <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-14 h-10 p-1" />
                  <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Taxa de Entrega</Label>
                <Input type="number" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Bairro Retirada</Label>
                <Input value={form.pickup_neighborhood} onChange={(e) => setForm({ ...form, pickup_neighborhood: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Plano</Label>
                <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preço</Label>
                <Input type="number" value={form.plan_price} onChange={(e) => setForm({ ...form, plan_price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.plan_status} onValueChange={(v) => setForm({ ...form, plan_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="overdue">Inadimplente</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
