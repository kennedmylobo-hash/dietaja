import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";
import { lazy, Suspense } from "react";

const SADashboard = lazy(() => import("@/components/super-admin/SADashboard"));
const SATenantsManager = lazy(() => import("@/components/super-admin/SATenantsManager"));
const SAPlansManager = lazy(() => import("@/components/super-admin/SAPlansManager"));
const SABilling = lazy(() => import("@/components/super-admin/SABilling"));
const SAOnboarding = lazy(() => import("@/components/super-admin/SAOnboarding"));

const SectionLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const SuperAdmin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin");
        const isAdmin = roles?.some((r: any) => r.role === "admin");

        if (isSuperAdmin || isAdmin) {
          setIsAuthenticated(true);
        } else {
          toast({ title: "Acesso negado", description: "Você não tem permissão de super admin.", variant: "destructive" });
          await supabase.auth.signOut();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin");
      if (!isSuperAdmin) {
        await supabase.auth.signOut();
        throw new Error("Você não tem permissão de super admin.");
      }

      setIsAuthenticated(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-primary" />
            <CardTitle>Super Admin</CardTitle>
            <p className="text-sm text-muted-foreground">Acesso restrito à gestão da plataforma</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard": return <SADashboard />;
      case "tenants": return <SATenantsManager />;
      case "plans": return <SAPlansManager />;
      case "billing": return <SABilling />;
      case "onboarding": return <SAOnboarding />;
      default: return <SADashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="md:ml-60 pt-16 md:pt-0 min-h-screen">
        <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
          <div />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>

        <div className="p-4 md:p-6">
          <Suspense fallback={<SectionLoader />}>
            {renderSection()}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin;
