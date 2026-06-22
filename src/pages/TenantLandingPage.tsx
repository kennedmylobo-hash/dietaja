import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, UtensilsCrossed, Star, Shield, Truck } from "lucide-react";

const TenantLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase
        .rpc("get_tenant_by_filter", { _slug: slug })
        .maybeSingle();
      if (data) setTenant(data);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <UtensilsCrossed className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Restaurante não encontrado</h1>
        <p className="text-muted-foreground mb-4">O link que você acessou não está mais ativo.</p>
        <Button onClick={() => navigate("/")}>Ver restaurantes disponíveis</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="relative max-w-2xl mx-auto px-4 py-20 text-center">
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenant.brand_name} className="h-16 mx-auto mb-6 object-contain" />
          )}
          <h1 className="text-4xl font-bold tracking-tight mb-3">{tenant.brand_name || tenant.name}</h1>
          {tenant.brand_slogan && (
            <p className="text-lg text-muted-foreground mb-8">{tenant.brand_slogan}</p>
          )}
          <div className="flex justify-center gap-3">
            <Button size="lg" onClick={() => navigate(`/?tenant=${slug}`)}>
              Ver Cardápio <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            {tenant.whatsapp && (
              <Button size="lg" variant="outline" onClick={() => window.open(`https://wa.me/${tenant.whatsapp}`, "_blank")}>
                Fale Conosco
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-6 text-center">
              <UtensilsCrossed className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Cardápio Variado</h3>
              <p className="text-sm text-muted-foreground">Opções FIT e FITNESS para todos os gostos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Truck className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Entrega Programada</h3>
              <p className="text-sm text-muted-foreground">Receba no dia e horário mais conveniente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Shield className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Qualidade Garantida</h3>
              <p className="text-sm text-muted-foreground">Ingredientes frescos e preparo artesanal</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Bottom */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-3">
            {tenant.city && tenant.state ? `${tenant.city}, ${tenant.state}` : ""}
          </p>
          <Button onClick={() => navigate(`/?tenant=${slug}`)}>
            Quero fazer meu pedido
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TenantLandingPage;
