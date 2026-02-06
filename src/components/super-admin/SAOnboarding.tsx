import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

const DIETA_JA_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export default function SAOnboarding() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cloneMenu, setCloneMenu] = useState(true);
  const [form, setForm] = useState({
    brand_name: "",
    slug: "",
    city: "",
    state: "",
    whatsapp: "",
    admin_email: "",
    admin_password: "",
    plan_type: "basico",
    primary_color: "#22c55e",
    order_prefix: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke("create-tenant", {
        body: {
          ...form,
          clone_menu_from: cloneMenu ? DIETA_JA_TENANT_ID : null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      toast({ title: "Restaurante criado!", description: `${form.brand_name} está pronto para usar.` });
      setForm({
        brand_name: "",
        slug: "",
        city: "",
        state: "",
        whatsapp: "",
        admin_email: "",
        admin_password: "",
        plan_type: "basico",
        primary_color: "#22c55e",
        order_prefix: "",
      });
    } catch (err: any) {
      toast({ title: "Erro no onboarding", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cadastrar Novo Restaurante</h1>

      {success && (
        <Card className="mb-6 border-green-500">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="font-medium">Restaurante criado com sucesso! O admin já pode fazer login.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome do Restaurante *</Label>
              <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} required />
            </div>
            <div>
              <Label>Slug (subdomínio) *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="meu-restaurante"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">{form.slug || "slug"}.suaplataforma.com.br</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade *</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div>
                <Label>Estado *</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} required />
              </div>
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" />
            </div>
            <div>
              <Label>Prefixo do Pedido *</Label>
              <Input
                value={form.order_prefix}
                onChange={(e) => setForm({ ...form, order_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) })}
                placeholder="MFT"
                maxLength={5}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Ex: MFT → pedidos serão MFT-0001, MFT-0002…</p>
            </div>
            <div>
              <Label>Cor Primária</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-14 h-10 p-1" />
                <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
              </div>
            </div>

            {/* Clone menu option */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox
                id="cloneMenu"
                checked={cloneMenu}
                onCheckedChange={(checked) => setCloneMenu(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="cloneMenu" className="text-sm cursor-pointer leading-relaxed">
                <span className="font-medium">Clonar cardápio do Dieta Já como modelo</span>
                <span className="text-muted-foreground block text-xs mt-0.5">
                  Inclui pacotes de marmitas, sabores, kits, acompanhamentos, planos do clube e níveis de fidelidade
                </span>
              </Label>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">Conta do Administrador</h3>
              <div className="space-y-4">
                <div>
                  <Label>Email do Admin *</Label>
                  <Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} required />
                </div>
                <div>
                  <Label>Senha Temporária *</Label>
                  <Input type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} minLength={6} required />
                </div>
              </div>
            </div>

            <div>
              <Label>Plano</Label>
              <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico - R$ 99/mês</SelectItem>
                  <SelectItem value="pro">Pro - R$ 199/mês</SelectItem>
                  <SelectItem value="premium">Premium - R$ 299/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Restaurante
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
