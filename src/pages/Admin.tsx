import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Eye, 
  Lock,
  Phone,
  Target,
  ShoppingCart,
  MessageCircle,
  LogOut,
  Download,
  BarChart3,
  Percent,
  Filter,
  MapPin,
  AlertCircle,
  UserX,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { toast } from "@/hooks/use-toast";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import OrdersManager from "@/components/admin/OrdersManager";
import MenuManager from "@/components/admin/MenuManager";
import StockReport from "@/components/admin/StockReport";
import StockHistory from "@/components/admin/StockHistory";
import FunnelReport from "@/components/admin/FunnelReport";
import PendingOrdersRecovery from "@/components/admin/PendingOrdersRecovery";
import AbandonedCartsRecovery from "@/components/admin/AbandonedCartsRecovery";
import MarketingManager from "@/components/admin/MarketingManager";
import NotificationTester from "@/components/admin/NotificationTester";
import NotificationStats from "@/components/admin/NotificationStats";
import LiveVisitors from "@/components/admin/LiveVisitors";
import LiveCarts from "@/components/admin/LiveCarts";
import PaymentErrorLogs from "@/components/admin/PaymentErrorLogs";
import ProductionPanel from "@/components/admin/ProductionPanel";
import WhatsAppOrderImporter from "@/components/admin/WhatsAppOrderImporter";
import SidesManager from "@/components/admin/SidesManager";
import CustomersManager from "@/components/admin/CustomersManager";
import KPIDashboard from "@/components/admin/KPIDashboard";
import ReviewsManager from "@/components/admin/ReviewsManager";
import RecurringCustomers from "@/components/admin/RecurringCustomers";
import TenantSettingsEditor from "@/components/admin/TenantSettingsEditor";
import LandingEditor from "@/components/admin/LandingEditor";
import ShoppingList from "@/components/admin/ShoppingList";
import CustomDietQuoter from "@/components/admin/CustomDietQuoter";
import FlavorProfitReport from "@/components/admin/FlavorProfitReport";
import ABTestManager from "@/components/admin/ABTestManager";

interface Lead {
  id: string;
  name: string;
  phone: string;
  location: string | null;
  objective: string | null;
  recommendation_name: string | null;
  recommendation_price: number | null;
  converted: boolean;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

interface AnalyticsSummary {
  totalPageViews: number;
  uniqueSessions: number;
  avgTimeOnPage: number;
  scrollDepth: { depth: number; count: number }[];
  topSections: { section: string; count: number }[];
}

interface DailyData {
  date: string;
  leads: number;
  visitors: number;
  conversionRate: number;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("live");
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('week');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  const navigate = useNavigate();

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Verify admin role with retry (RLS may need a moment after session restore)
        let adminRole = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role, tenant_id')
            .eq('user_id', session.user.id);
          
          console.log(`[Admin] Session restore role check attempt ${attempt + 1}:`, { roles, rolesError });
          adminRole = roles?.find((r: any) => r.role === 'admin' || r.role === 'super_admin');
          if (adminRole) break;
          await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
        }

        if (adminRole) {
          setIsAuthenticated(true);
        } else {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão de administrador.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
      fetchAnalytics();
    }
  }, [isAuthenticated, dateFilter]);

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    
    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        break;
    }
    
    return start.toISOString();
  };

  const fetchLeads = async () => {
    const startDate = getDateRange();
    
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    setLeads(data || []);
  };

  const fetchAnalytics = async () => {
    const startDate = getDateRange();
    
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate);

    if (error) {
      console.error('Error fetching analytics:', error);
      return;
    }

    setAnalyticsEvents(events || []);

    if (!events || events.length === 0) {
      setAnalytics({
        totalPageViews: 0,
        uniqueSessions: 0,
        avgTimeOnPage: 0,
        scrollDepth: [],
        topSections: [],
      });
      return;
    }

    // Calculate metrics
    const pageViews = events.filter(e => e.event_type === 'page_view').length;
    const uniqueSessions = new Set(events.map(e => e.session_id)).size;
    
    const timeEvents = events.filter(e => e.event_type === 'time_on_page' && e.time_on_page);
    const avgTime = timeEvents.length > 0
      ? Math.round(timeEvents.reduce((sum, e) => sum + (e.time_on_page || 0), 0) / timeEvents.length)
      : 0;

    // Scroll depth distribution
    const scrollEvents = events.filter(e => e.event_type === 'scroll');
    const scrollDepthMap: Record<number, number> = { 25: 0, 50: 0, 75: 0, 100: 0 };
    scrollEvents.forEach(e => {
      if (e.scroll_depth && scrollDepthMap[e.scroll_depth] !== undefined) {
        scrollDepthMap[e.scroll_depth]++;
      }
    });
    const scrollDepth = Object.entries(scrollDepthMap).map(([depth, count]) => ({
      depth: parseInt(depth),
      count,
    }));

    // Top sections viewed
    const sectionEvents = events.filter(e => e.event_type === 'section_view' && e.section);
    const sectionCounts: Record<string, number> = {};
    sectionEvents.forEach(e => {
      if (e.section) {
        sectionCounts[e.section] = (sectionCounts[e.section] || 0) + 1;
      }
    });
    const topSections = Object.entries(sectionCounts)
      .map(([section, count]) => ({ section, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setAnalytics({
      totalPageViews: pageViews,
      uniqueSessions: uniqueSessions,
      avgTimeOnPage: avgTime,
      scrollDepth,
      topSections,
    });
  };

  // Get unique sources for filter dropdown
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    leads.forEach(lead => {
      if (lead.utm_source) sources.add(lead.utm_source);
    });
    analyticsEvents.forEach(event => {
      if (event.utm_source) sources.add(event.utm_source);
    });
    return Array.from(sources).sort();
  }, [leads, analyticsEvents]);

  // Get unique locations for filter dropdown
  const availableLocations = useMemo(() => {
    const locations = new Set<string>();
    leads.forEach(lead => {
      if (lead.location) locations.add(lead.location);
    });
    return Array.from(locations).sort();
  }, [leads]);

  // Filter data by source and location
  const filteredLeads = useMemo(() => {
    let filtered = leads;
    
    // Filter by source
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'direct') {
        filtered = filtered.filter(l => !l.utm_source);
      } else {
        filtered = filtered.filter(l => l.utm_source === sourceFilter);
      }
    }
    
    // Filter by location
    if (locationFilter !== 'all') {
      if (locationFilter === 'sem-local') {
        filtered = filtered.filter(l => !l.location);
      } else {
        filtered = filtered.filter(l => l.location === locationFilter);
      }
    }
    
    return filtered;
  }, [leads, sourceFilter, locationFilter]);

  // Location distribution data
  const locationDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    filteredLeads.forEach(lead => {
      const loc = lead.location || 'Sem localização';
      distribution[loc] = (distribution[loc] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads]);

  const filteredEvents = useMemo(() => {
    if (sourceFilter === 'all') return analyticsEvents;
    if (sourceFilter === 'direct') return analyticsEvents.filter(e => !e.utm_source);
    return analyticsEvents.filter(e => e.utm_source === sourceFilter);
  }, [analyticsEvents, sourceFilter]);

  // Calculate daily chart data
  const dailyChartData = useMemo((): DailyData[] => {
    const days = dateFilter === 'today' ? 1 : dateFilter === 'week' ? 7 : 30;
    const data: DailyData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      // Count leads for this day (filtered)
      const dayLeads = filteredLeads.filter(lead => {
        const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
        return leadDate === dateStr;
      }).length;
      
      // Count unique visitors for this day (filtered)
      const dayVisitors = new Set(
        filteredEvents
          .filter(e => {
            const eventDate = new Date(e.created_at).toISOString().split('T')[0];
            return eventDate === dateStr && e.event_type === 'page_view';
          })
          .map(e => e.session_id)
      ).size;
      
      // Calculate conversion rate (leads / visitors * 100)
      const conversionRate = dayVisitors > 0 
        ? Math.round((dayLeads / dayVisitors) * 100 * 10) / 10 
        : 0;
      
      data.push({
        date: displayDate,
        leads: dayLeads,
        visitors: dayVisitors,
        conversionRate,
      });
    }
    
    return data;
  }, [filteredLeads, filteredEvents, dateFilter]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (error) throw error;

      if (data.user) {
        setSignupSuccess(true);
        toast({
          title: "Conta criada!",
          description: "Agora peça ao desenvolvedor para ativar sua permissão de admin.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check admin role with retry (RLS may need a moment after fresh login)
      let adminRole = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role, tenant_id')
          .eq('user_id', data.user.id);

        console.log(`[Admin] Role check attempt ${attempt + 1}:`, { roles, rolesError });
        adminRole = roles?.find((r: any) => r.role === 'admin' || r.role === 'super_admin');
        if (adminRole) break;
        // Wait before retrying - increase delay each attempt
        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
      }

      if (!adminRole) {
        await supabase.auth.signOut();
        throw new Error('Você não tem permissão de administrador.');
      }

      setIsAuthenticated(true);
      toast({
        title: "Login realizado!",
        description: "Bem-vindo ao painel administrativo.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Digite seu email para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);

    try {
      const response = await supabase.functions.invoke('send-password-reset', {
        body: { email }
      });

      if (response.error) {
        throw response.error;
      }

      setResetEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada e spam.",
      });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      // Still show success to prevent email enumeration
      setResetEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Se o email estiver cadastrado, você receberá o link.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    navigate('/');
  };

  const openWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(`Olá ${name}! Vi que você se interessou pelos nossos produtos. Posso te ajudar?`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const exportLeadsCSV = () => {
    if (filteredLeads.length === 0) return;

    const headers = ['Nome', 'Telefone', 'Localização', 'Objetivo', 'Recomendação', 'Preço', 'Convertido', 'Origem', 'Campanha', 'Data'];
    const rows = filteredLeads.map(lead => [
      lead.name,
      lead.phone,
      lead.location || '',
      lead.objective || '',
      lead.recommendation_name || '',
      lead.recommendation_price?.toString() || '',
      lead.converted ? 'Sim' : 'Não',
      lead.utm_source || '',
      lead.utm_campaign || '',
      new Date(lead.created_at).toLocaleString('pt-BR'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const sourceLabel = sourceFilter !== 'all' ? `-${sourceFilter}` : '';
    link.download = `leads-${dateFilter}${sourceLabel}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Login/Signup screen
  if (!isAuthenticated) {
    if (signupSuccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle>Conta criada com sucesso!</CardTitle>
              <p className="text-muted-foreground text-sm">
                Aguarde a ativação da permissão de administrador para fazer login.
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => {
                  setSignupSuccess(false);
                  setIsSignup(false);
                }}
              >
                Voltar para login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Email sent confirmation screen
    if (resetEmailSent) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Email enviado!</CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Verifique sua caixa de entrada e spam. O link expira em 1 hora.
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => {
                  setResetEmailSent(false);
                  setShowForgotPassword(false);
                }}
              >
                Voltar para login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Forgot password form
    if (showForgotPassword) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Recuperar senha</CardTitle>
              <p className="text-muted-foreground text-sm">
                Digite seu email para receber o link de recuperação
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Voltar para login
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Login/Signup form
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>{isSignup ? 'Criar conta' : 'Painel Administrativo'}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {isSignup ? 'Crie sua conta para solicitar acesso' : 'Faça login para acessar os relatórios'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (isSignup ? 'Criando...' : 'Entrando...') : (isSignup ? 'Criar conta' : 'Entrar')}
              </Button>
            </form>
            <div className="mt-4 flex flex-col items-center gap-2">
              {!isSignup && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 hover:underline"
                >
                  Esqueci minha senha
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isSignup ? 'Já tem conta? Fazer login' : 'Não tem conta? Criar conta'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render section content based on activeSection
  const renderSectionContent = () => {
    switch (activeSection) {
      case "live":
        return (
          <div className="space-y-6">
            <LiveVisitors />
            <LiveCarts />
          </div>
        );

      case "orders":
        return <OrdersManager dateFilter={dateFilter} />;

      case "production":
        return <ProductionPanel dateFilter={dateFilter} />;

      case "shopping-list":
        return <ShoppingList dateFilter={dateFilter} />;

       case "recurring":
         return <RecurringCustomers />;
 
      case "whatsapp-import":
        return <WhatsAppOrderImporter />;

      case "kpis":
        return (
          <div className="space-y-8">
            <KPIDashboard dateFilter={dateFilter} />
            <FlavorProfitReport dateFilter={dateFilter} />
          </div>
        );

      case "reviews":
        return <ReviewsManager />;

      case "analytics":
        return (
          <div className="space-y-8">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{filteredLeads.length}</p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{filteredLeads.filter(l => l.converted).length}</p>
                      <p className="text-xs text-muted-foreground">Convertidos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{new Set(filteredEvents.filter(e => e.event_type === 'page_view').map(e => e.session_id)).size}</p>
                      <p className="text-xs text-muted-foreground">Visitantes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {(() => {
                          const timeEvents = filteredEvents.filter(e => e.event_type === 'time_on_page' && e.time_on_page);
                          const avgTime = timeEvents.length > 0
                            ? Math.round(timeEvents.reduce((sum, e) => sum + (e.time_on_page || 0), 0) / timeEvents.length)
                            : 0;
                          return avgTime ? `${Math.floor(avgTime / 60)}:${String(avgTime % 60).padStart(2, '0')}` : '0:00';
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">Tempo médio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evolution Charts */}
            {dateFilter !== 'today' && (
              <div className="grid md:grid-cols-3 gap-4">
                {/* Leads Evolution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Evolução de Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyChartData.some(d => d.leads > 0) ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={dailyChartData}>
                          <defs>
                            <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-muted-foreground" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="leads" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            fill="url(#leadsGradient)"
                            name="Leads"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Sem leads no período</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Visitors Evolution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-500" />
                      Evolução de Visitantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyChartData.some(d => d.visitors > 0) ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={dailyChartData}>
                          <defs>
                            <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-muted-foreground" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="visitors" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            fill="url(#visitorsGradient)"
                            name="Visitantes"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Sem visitantes no período</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Conversion Rate Evolution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Percent className="w-5 h-5 text-green-500" />
                      Taxa de Conversão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyChartData.some(d => d.visitors > 0) ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={dailyChartData}>
                          <defs>
                            <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={true} unit="%" className="text-muted-foreground" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value: number) => [`${value}%`, 'Conversão']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="conversionRate" 
                            stroke="#22c55e" 
                            strokeWidth={2}
                            fill="url(#conversionGradient)"
                            name="Taxa de Conversão"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Sem dados no período</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Leads Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Leads Capturados
                  {sourceFilter !== 'all' && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({sourceFilter === 'direct' ? 'Direto' : sourceFilter})
                    </span>
                  )}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportLeadsCSV} disabled={filteredLeads.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {filteredLeads.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum lead capturado no período{sourceFilter !== 'all' ? ` para origem "${sourceFilter === 'direct' ? 'Direto' : sourceFilter}"` : ''}.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-3 font-medium text-muted-foreground">Nome</th>
                          <th className="pb-3 font-medium text-muted-foreground">Contato</th>
                          <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Local</th>
                          <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Objetivo</th>
                          <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Recomendação</th>
                          <th className="pb-3 font-medium text-muted-foreground hidden xl:table-cell">Origem</th>
                          <th className="pb-3 font-medium text-muted-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map((lead) => (
                          <tr key={lead.id} className="border-b last:border-0">
                            <td className="py-3">
                              <div>
                                <p className="font-medium">{lead.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </td>
                            <td className="py-3">
                              <p className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </p>
                            </td>
                            <td className="py-3 hidden md:table-cell">
                              {lead.location ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs">
                                  <MapPin className="w-3 h-3" />
                                  {lead.location}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 hidden md:table-cell">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs">
                                <Target className="w-3 h-3" />
                                {lead.objective || '-'}
                              </span>
                            </td>
                            <td className="py-3 hidden lg:table-cell">
                              {lead.recommendation_name && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                  <ShoppingCart className="w-3 h-3" />
                                  {lead.recommendation_name}
                                </span>
                              )}
                            </td>
                            <td className="py-3 hidden xl:table-cell text-xs text-muted-foreground">
                              {lead.utm_source || 'direto'}
                            </td>
                            <td className="py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openWhatsApp(lead.phone, lead.name)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Distribution */}
            {locationDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    Distribuição por Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {locationDistribution.map(({ location, count }) => {
                      const percentage = Math.round((count / filteredLeads.length) * 100);
                      return (
                        <div key={location} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{location}</span>
                            <span className="text-muted-foreground">{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analytics Section */}
            {analytics && (analytics.scrollDepth.length > 0 || analytics.topSections.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Scroll Depth */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profundidade de Scroll</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.scrollDepth.map(({ depth, count }) => (
                        <div key={depth}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{depth}%</span>
                            <span className="text-muted-foreground">{count} sessões</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{
                                width: `${Math.min((count / (analytics.uniqueSessions || 1)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Sections */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Seções Mais Vistas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.topSections.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Sem dados de seções ainda.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.topSections.map(({ section, count }, index) => (
                          <div key={section} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                {index + 1}
                              </span>
                              <span className="text-sm">{section}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{count}x</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      case "funnel":
        return <FunnelReport dateFilter={dateFilter} sourceFilter={sourceFilter} />;

       case "customers":
         return <CustomersManager dateFilter={dateFilter} />;
 
      case "custom-diet":
        return <CustomDietQuoter />;

      case "menu":
        return (
          <div className="space-y-6">
            <MenuManager />
            <SidesManager />
          </div>
        );

      case "stock":
        return <StockReport />;

      case "history":
        return <StockHistory />;

      case "marketing":
        return (
          <div className="space-y-6">
            <NotificationTester />
            <MarketingManager />
          </div>
        );

      case "notifications":
        return <NotificationStats />;

      case "recovery":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Pedidos Pendentes de Pagamento
              </h3>
              <PendingOrdersRecovery />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-yellow-500" />
                Carrinhos Abandonados (sem pedido)
              </h3>
              <AbandonedCartsRecovery />
            </div>
          </div>
        );

      case "payment-errors":
        return <PaymentErrorLogs />;

      case "tenant-settings":
        return <TenantSettingsEditor />;

      case "landing-editor":
        return <LandingEditor />;

      case "ab-tests":
        return <ABTestManager />;

      default:
        return <div className="text-muted-foreground">Selecione uma seção no menu</div>;
    }
  };

  // Dashboard with sidebar
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Main Content */}
      <main className="md:ml-60 pt-16 md:pt-0">
        {/* Top toolbar */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-16 md:top-0 z-20">
          <div className="px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas...</SelectItem>
                  <SelectItem value="direct">Direto</SelectItem>
                  {availableSources.map(source => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas...</SelectItem>
                  <SelectItem value="sem-local">Sem local</SelectItem>
                  {availableLocations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {(['today', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setDateFilter(period)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      dateFilter === period
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {period === 'today' ? 'Hoje' : period === 'week' ? '7 dias' : '30 dias'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  localStorage.removeItem('dietaja_customer');
                  toast({
                    title: "Dados limpos!",
                    description: "Agora você pode testar como um novo cliente.",
                  });
                }}
                title="Limpar dados salvos do cliente para testar o modal de identificação"
              >
                <UserX className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Simular Novo Cliente</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-6">
          {renderSectionContent()}
        </div>
      </main>
    </div>
  );
};

export default Admin;
