import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Store, Upload, Link2, Copy, Check, Truck, Clock } from "lucide-react";

export default function TenantSettingsEditor() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

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
    delivery_days: [3],
    cutoff_day: 0,
    cutoff_time: "18:00",
    production_day: 1,
    cutoff_message: "Pedidos após as 18h de sábado entram na produção da próxima semana.",
  });

  useEffect(() => {
    if (tenant) {
      const dc = tenant.delivery_config || {};
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
        delivery_days: dc.delivery_days || [3],
        cutoff_day: dc.cutoff_day ?? 0,
        cutoff_time: dc.cutoff_time || "18:00",
        production_day: dc.production_day ?? 1,
        cutoff_message: dc.cutoff_message || "Pedidos após as 18h de sábado entram na produção da próxima semana.",
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { delivery_days, cutoff_day, cutoff_time, production_day, cutoff_message, ...flatFields } = data;
      const { error } = await supabase
        .from("tenants")
        .update({
          ...flatFields,
          delivery_config: { delivery_days, cutoff_day, cutoff_time, production_day, cutoff_message },
        })
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
          {tenant && (() => {
            const publicUrl = tenant.domain
              ? `https://${tenant.domain}`
              : `https://diet-on-demand.lovable.app?tenant=${tenant.slug}`;
            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Link2 className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Link da sua loja</p>
                  <p className="text-sm text-primary font-mono truncate">{publicUrl}</p>
                  <p className="text-xs text-muted-foreground mt-1">Compartilhe este link com seus clientes</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0"
                >
                  {copied ? <><Check className="w-4 h-4 mr-1" /> Copiado!</> : <><Copy className="w-4 h-4 mr-1" /> Copiar</>}
                </Button>
              </div>
            );
          })()}

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Agendamento de Entregas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Dias de Entrega</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { value: 0, label: "Dom" },
                  { value: 1, label: "Seg" },
                  { value: 2, label: "Ter" },
                  { value: 3, label: "Qua" },
                  { value: 4, label: "Qui" },
                  { value: 5, label: "Sex" },
                  { value: 6, label: "Sáb" },
                ].map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      const days = form.delivery_days.includes(d.value)
                        ? form.delivery_days.filter((v) => v !== d.value)
                        : [...form.delivery_days, d.value];
                      setForm({ ...form, delivery_days: days });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.delivery_days.includes(d.value)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/30 bg-muted/30"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Selecione os dias da semana em que as entregas ocorrem.</p>
            </div>
            <div>
              <Label>Dia de Corte</Label>
              <select
                value={form.cutoff_day}
                onChange={(e) => setForm({ ...form, cutoff_day: Number(e.target.value) })}
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {[
                  { value: 0, label: "Domingo" },
                  { value: 1, label: "Segunda-feira" },
                  { value: 2, label: "Terça-feira" },
                  { value: 3, label: "Quarta-feira" },
                  { value: 4, label: "Quinta-feira" },
                  { value: 5, label: "Sexta-feira" },
                  { value: 6, label: "Sábado" },
                ].map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Último dia para pedir e entrar na produção da semana.</p>
            </div>
            <div>
              <Label>Horário de Corte</Label>
              <Input
                type="time"
                value={form.cutoff_time}
                onChange={(e) => setForm({ ...form, cutoff_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Horário limite no dia de corte.</p>
            </div>
            <div>
              <Label>Dia de Produção</Label>
              <select
                value={form.production_day}
                onChange={(e) => setForm({ ...form, production_day: Number(e.target.value) })}
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {[
                  { value: 0, label: "Domingo" },
                  { value: 1, label: "Segunda-feira" },
                  { value: 2, label: "Terça-feira" },
                  { value: 3, label: "Quarta-feira" },
                  { value: 4, label: "Quinta-feira" },
                  { value: 5, label: "Sexta-feira" },
                  { value: 6, label: "Sábado" },
                ].map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Dia em que as marmitas são produzidas.</p>
            </div>
          </div>
          <div>
            <Label>Mensagem de Corte</Label>
            <Input
              value={form.cutoff_message}
              onChange={(e) => setForm({ ...form, cutoff_message: e.target.value })}
              placeholder="Pedidos após as 18h de sábado entram na produção da próxima semana."
            />
            <p className="text-xs text-muted-foreground mt-1">Texto exibido no checkout sobre o horário de corte.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
