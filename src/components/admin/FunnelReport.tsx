import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  MousePointerClick, 
  ShoppingCart, 
  CreditCard,
  ChevronDown,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  TrendingDown,
  BarChart3,
  Users
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FunnelReportProps {
  dateFilter: 'today' | 'week' | 'month';
  sourceFilter: string;
}

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff: number;
  icon: React.ReactNode;
  color: string;
}

interface SectionEngagement {
  section: string;
  views: number;
  avgTime: number;
  percentage: number;
}

interface SessionJourney {
  sessionId: string;
  date: string;
  device: string;
  source: string;
  events: { time: string; type: string; section?: string; timeSpent?: number }[];
  completed: boolean;
}

const FunnelReport = ({ dateFilter, sourceFilter }: FunnelReportProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const startDate = getDateRange();
      
      let query = supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });
      
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'direct') {
          query = query.is('utm_source', null);
        } else {
          query = query.eq('utm_source', sourceFilter);
        }
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [dateFilter, sourceFilter]);

  // Calcular dados do funil
  const funnelData = useMemo((): FunnelStage[] => {
    if (events.length === 0) return [];

    const sessions = new Set(events.map(e => e.session_id));
    const totalSessions = sessions.size;

    // Contar cada etapa
    const pageViews = new Set(events.filter(e => e.event_type === 'page_view').map(e => e.session_id)).size;
    const scrolled = new Set(events.filter(e => e.event_type === 'scroll' && (e.scroll_depth || 0) >= 50).map(e => e.session_id)).size;
    const viewedSections = new Set(events.filter(e => e.event_type === 'section_enter').map(e => e.session_id)).size;
    const clickedCTA = new Set(events.filter(e => e.event_type === 'cta_click').map(e => e.session_id)).size;
    const openedCart = new Set(events.filter(e => e.event_type === 'cart_open').map(e => e.session_id)).size;
    const addedToCart = new Set(events.filter(e => e.event_type === 'cart_add').map(e => e.session_id)).size;
    const startedCheckout = new Set(events.filter(e => e.event_type === 'checkout_start').map(e => e.session_id)).size;
    const completed = new Set(events.filter(e => e.event_type === 'checkout_complete').map(e => e.session_id)).size;

    const stages = [
      { name: 'Visitantes únicos', count: pageViews, icon: <Eye className="w-5 h-5" />, color: 'bg-blue-500' },
      { name: 'Scrollaram 50%+', count: scrolled, icon: <ChevronDown className="w-5 h-5" />, color: 'bg-indigo-500' },
      { name: 'Viram seções', count: viewedSections || scrolled, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-violet-500' },
      { name: 'Clicaram CTA', count: clickedCTA, icon: <MousePointerClick className="w-5 h-5" />, color: 'bg-purple-500' },
      { name: 'Abriram carrinho', count: openedCart, icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-fuchsia-500' },
      { name: 'Adicionaram item', count: addedToCart || openedCart, icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-pink-500' },
      { name: 'Iniciaram checkout', count: startedCheckout, icon: <CreditCard className="w-5 h-5" />, color: 'bg-rose-500' },
      { name: 'Finalizaram', count: completed, icon: <CreditCard className="w-5 h-5" />, color: 'bg-green-500' },
    ];

    const baseCount = stages[0].count || 1;
    
    return stages.map((stage, index) => ({
      ...stage,
      percentage: Math.round((stage.count / baseCount) * 100),
      dropoff: index > 0 
        ? Math.round(((stages[index - 1].count - stage.count) / (stages[index - 1].count || 1)) * 100) 
        : 0,
    }));
  }, [events]);

  // Calcular engajamento por seção
  const sectionEngagement = useMemo((): SectionEngagement[] => {
    const sectionEvents = events.filter(e => 
      e.event_type === 'section_enter' || e.event_type === 'section_exit'
    );
    
    const sectionMap = new Map<string, { views: number; totalTime: number; exits: number }>();
    
    sectionEvents.forEach(event => {
      const section = event.section;
      if (!section) return;
      
      if (!sectionMap.has(section)) {
        sectionMap.set(section, { views: 0, totalTime: 0, exits: 0 });
      }
      
      const data = sectionMap.get(section)!;
      
      if (event.event_type === 'section_enter') {
        data.views++;
      } else if (event.event_type === 'section_exit' && event.section_time_spent) {
        data.totalTime += event.section_time_spent;
        data.exits++;
      }
    });
    
    const totalSessions = new Set(events.filter(e => e.event_type === 'page_view').map(e => e.session_id)).size || 1;
    
    const sections = Array.from(sectionMap.entries())
      .map(([section, data]) => ({
        section,
        views: data.views,
        avgTime: data.exits > 0 ? Math.round(data.totalTime / data.exits) : 0,
        percentage: Math.round((data.views / totalSessions) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);
    
    return sections;
  }, [events]);

  // Calcular jornadas de sessão
  const sessionJourneys = useMemo((): SessionJourney[] => {
    const sessionMap = new Map<string, SessionJourney>();
    
    events.forEach(event => {
      if (!sessionMap.has(event.session_id)) {
        sessionMap.set(event.session_id, {
          sessionId: event.session_id,
          date: new Date(event.created_at).toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          device: event.device_type || 'desktop',
          source: event.utm_source || 'direto',
          events: [],
          completed: false,
        });
      }
      
      const session = sessionMap.get(event.session_id)!;
      
      // Adicionar evento à jornada
      const eventTime = new Date(event.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      let eventLabel = '';
      switch (event.event_type) {
        case 'page_view': eventLabel = 'Entrou no site'; break;
        case 'scroll': eventLabel = `Scrollou ${event.scroll_depth}%`; break;
        case 'section_enter': eventLabel = `Viu ${event.section}`; break;
        case 'section_exit': eventLabel = `Saiu de ${event.section}`; break;
        case 'cta_click': eventLabel = `Clicou "${event.section}"`; break;
        case 'cart_open': eventLabel = 'Abriu carrinho'; break;
        case 'cart_add': eventLabel = 'Adicionou ao carrinho'; break;
        case 'checkout_start': eventLabel = 'Iniciou checkout'; break;
        case 'checkout_complete': 
          eventLabel = 'Finalizou pedido ✓'; 
          session.completed = true;
          break;
        default: eventLabel = event.event_type;
      }
      
      session.events.push({
        time: eventTime,
        type: eventLabel,
        section: event.section,
        timeSpent: event.section_time_spent,
      });
    });
    
    // Retornar as 20 sessões mais recentes
    return Array.from(sessionMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [events]);

  // Estatísticas por dispositivo
  const deviceStats = useMemo(() => {
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    const sessionDevices = new Map<string, string>();
    
    events.forEach(event => {
      if (!sessionDevices.has(event.session_id) && event.device_type) {
        sessionDevices.set(event.session_id, event.device_type);
      }
    });
    
    sessionDevices.forEach(device => {
      if (device === 'mobile') devices.mobile++;
      else if (device === 'tablet') devices.tablet++;
      else devices.desktop++;
    });
    
    return devices;
  }, [events]);

  const DeviceIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Sem dados de funil no período selecionado.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Os dados aparecerão conforme os visitantes navegarem no site.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deviceStats.mobile}</p>
                <p className="text-xs text-muted-foreground">Mobile</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deviceStats.desktop}</p>
                <p className="text-xs text-muted-foreground">Desktop</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Tablet className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deviceStats.tablet}</p>
                <p className="text-xs text-muted-foreground">Tablet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.map((stage, index) => (
              <div key={stage.name} className="relative">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${stage.color}/10 flex items-center justify-center`}>
                    <div className={`${stage.color.replace('bg-', 'text-')}`}>
                      {stage.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{stage.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {stage.count} ({stage.percentage}%)
                        </span>
                        {stage.dropoff > 0 && (
                          <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                            -{stage.dropoff}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section Engagement Map */}
      {sectionEngagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Engajamento por Seção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sectionEngagement.slice(0, 10).map((section) => (
                <div key={section.section} className="flex items-center gap-4">
                  <div className="w-32 sm:w-40 truncate">
                    <span className="text-sm font-medium">{section.section}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${section.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground w-32 justify-end">
                    <span>{section.percentage}%</span>
                    {section.avgTime > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {section.avgTime}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Journeys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Jornadas dos Visitantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sessionJourneys.map((session) => (
                <div 
                  key={session.sessionId}
                  className={`border rounded-lg p-3 transition-colors ${
                    session.completed ? 'border-green-500/30 bg-green-500/5' : ''
                  }`}
                >
                  <button
                    onClick={() => setExpandedSession(
                      expandedSession === session.sessionId ? null : session.sessionId
                    )}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <DeviceIcon type={session.device} />
                      <div>
                        <p className="text-sm font-medium">
                          {session.date}
                          {session.completed && (
                            <span className="ml-2 text-green-500 text-xs">✓ Converteu</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.source} • {session.events.length} eventos
                        </p>
                      </div>
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform ${
                        expandedSession === session.sessionId ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                  
                  {expandedSession === session.sessionId && (
                    <div className="mt-3 pl-7 border-l-2 border-muted space-y-2">
                      {session.events.slice(0, 20).map((event, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground text-xs w-16 flex-shrink-0">
                            {event.time}
                          </span>
                          <span className={event.type.includes('✓') ? 'text-green-500 font-medium' : ''}>
                            {event.type}
                            {event.timeSpent && event.timeSpent > 0 && (
                              <span className="text-muted-foreground ml-1">
                                ({event.timeSpent}s)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      {session.events.length > 20 && (
                        <p className="text-xs text-muted-foreground">
                          +{session.events.length - 20} eventos...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FunnelReport;
