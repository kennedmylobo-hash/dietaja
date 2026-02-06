import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Store, Upload } from "lucide-react";

export default function TenantSettingsEditor() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    brand_name: "",
    brand_slogan: "",
    primary_color: "#22c55e",
    city: "",
    state: "",
    pickup_neighborhood: "",
    whatsapp: "",
    delivery_fee: 0,
    facebook_pixel_id: "",
    google_analytics_id: "",
    domain: "",
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        brand_name: tenant.brand_name || "",
        brand_slogan: tenant.brand_slogan || "",
        primary_color: tenant.primary_color || "#22c55e",
        city: tenant.city || "",
        state: tenant.state || "",
        pickup_neighborhood: tenant.pickup_neighborhood || "",
        whatsapp: tenant.whatsapp || "",
        delivery_fee: tenant.delivery_fee || 0,
        facebook_pixel_id: tenant.facebook_pixel_id || "",
        google_analytics_id: tenant.google_analytics_id || "",
        domain: tenant.domain || "",
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { error } = await supabase
        .from("tenants")
        .update(data)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast({ title: "Dados salvos!", description: "As configurações do restaurante foram atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const path = `${tenantId}/logo.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    await supabase.from("tenants").update({ logo_url: urlData.publicUrl }).eq("id", tenantId);
    queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
    toast({ title: "Logo atualizado!" });
  };

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Dados do Restaurante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome da Marca</Label>
              <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input value={form.brand_slogan} onChange={(e) => setForm({ ...form, brand_slogan: e.target.value })} />
            </div>
            <div>
              <Label>Cor Primária</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5577999999999" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label>Bairro de Retirada</Label>
              <Input value={form.pickup_neighborhood} onChange={(e) => setForm({ ...form, pickup_neighborhood: e.target.value })} />
            </div>
            <div>
              <Label>Taxa de Entrega (R$)</Label>
              <Input type="number" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="md:col-span-2">
              <Label>Domínio Personalizado</Label>
              <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="www.meurestaurante.com.br" />
              <p className="text-xs text-muted-foreground mt-1">
                Configure o DNS do seu domínio apontando para o IP <code className="bg-muted px-1 rounded">185.158.133.1</code> (registro A) ou CNAME para <code className="bg-muted px-1 rounded">suaplataforma.com.br</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label>Facebook Pixel ID</Label>
              <Input value={form.facebook_pixel_id} onChange={(e) => setForm({ ...form, facebook_pixel_id: e.target.value })} placeholder="Opcional" />
            </div>
            <div>
              <Label>Google Analytics ID</Label>
              <Input value={form.google_analytics_id} onChange={(e) => setForm({ ...form, google_analytics_id: e.target.value })} placeholder="Opcional" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Label>Logo</Label>
            <div className="flex items-center gap-4 mt-2">
              {tenant?.logo_url && (
                <img src={tenant.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded border" />
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Logo</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="w-full md:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
