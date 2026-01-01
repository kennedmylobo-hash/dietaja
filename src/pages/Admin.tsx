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
  Percent
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

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
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('week');
  
  const navigate = useNavigate();

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Verify admin role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (roles?.role === 'admin') {
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

  // Calculate daily chart data
  const dailyChartData = useMemo((): DailyData[] => {
    const days = dateFilter === 'today' ? 1 : dateFilter === 'week' ? 7 : 30;
    const data: DailyData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      // Count leads for this day
      const dayLeads = leads.filter(lead => {
        const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
        return leadDate === dateStr;
      }).length;
      
      // Count unique visitors for this day
      const dayVisitors = new Set(
        analyticsEvents
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
  }, [leads, analyticsEvents, dateFilter]);

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

      // Check admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (roles?.role !== 'admin') {
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
    if (leads.length === 0) return;

    const headers = ['Nome', 'Telefone', 'Localização', 'Objetivo', 'Recomendação', 'Preço', 'Convertido', 'Origem', 'Campanha', 'Data'];
    const rows = leads.map(lead => [
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
    link.download = `leads-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`;
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
            <div className="mt-4 text-center">
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

  // Dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Painel Dieta Já</h1>
          <div className="flex items-center gap-4">
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
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{leads.length}</p>
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
                  <p className="text-2xl font-bold">{leads.filter(l => l.converted).length}</p>
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
                  <p className="text-2xl font-bold">{analytics?.uniqueSessions || 0}</p>
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
                    {analytics?.avgTimeOnPage ? `${Math.floor(analytics.avgTimeOnPage / 60)}:${String(analytics.avgTimeOnPage % 60).padStart(2, '0')}` : '0:00'}
                  </p>
                  <p className="text-xs text-muted-foreground">Tempo médio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evolution Charts */}
        {dateFilter !== 'today' && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
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
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        allowDecimals={false}
                        className="text-muted-foreground"
                      />
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
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        allowDecimals={false}
                        className="text-muted-foreground"
                      />
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
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        allowDecimals={true}
                        unit="%"
                        className="text-muted-foreground"
                      />
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
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Leads Capturados</CardTitle>
            <Button variant="outline" size="sm" onClick={exportLeadsCSV} disabled={leads.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum lead capturado no período selecionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Nome</th>
                      <th className="pb-3 font-medium text-muted-foreground">Contato</th>
                      <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Objetivo</th>
                      <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Recomendação</th>
                      <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Origem</th>
                      <th className="pb-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
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
                        <td className="py-3 hidden md:table-cell text-xs text-muted-foreground">
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
      </main>
    </div>
  );
};

export default Admin;
