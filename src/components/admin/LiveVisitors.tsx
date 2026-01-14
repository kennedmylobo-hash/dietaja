/**
 * Live Visitors Component
 * Exibe visitantes online em tempo real no Admin
 */

import { useOnlineVisitors, useRealtimeAnalytics } from '@/hooks/useRealtimePresence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Eye, 
  ShoppingCart,
  TrendingUp,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Componente de contador animado
const AnimatedCounter = ({ value }: { value: number }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="text-4xl font-bold text-primary"
    >
      {value}
    </motion.span>
  );
};

// Ícone do dispositivo
const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-4 w-4 text-blue-500" />;
    case 'tablet':
      return <Tablet className="h-4 w-4 text-purple-500" />;
    default:
      return <Monitor className="h-4 w-4 text-green-500" />;
  }
};

// Nome amigável da página
const getPageName = (path: string): string => {
  const pageNames: Record<string, string> = {
    '/': 'Página Inicial',
    '/cardapio': 'Cardápio',
    '/checkout': 'Checkout',
    '/obrigado': 'Obrigado',
    '/admin': 'Admin',
  };
  return pageNames[path] || path;
};

// Label amigável do evento com emojis
const getEventLabel = (eventType: string, section?: string): string => {
  const labels: Record<string, string> = {
    'cart_add': '🛒 Adicionou ao carrinho',
    'cart_remove': '🗑️ Removeu do carrinho',
    'cart_open': '👀 Abriu carrinho',
    'cart_opened': '👀 Abriu carrinho',
    'checkout_start': '💳 Iniciou checkout',
    'checkout_started': '💳 Iniciou checkout',
    'page_view': '📄 Visualização',
    'scroll': '📜 Scroll',
    'section_enter': '👁️ Seção',
    'section_view': '👁️ Viu seção',
    'section_exit': '👋 Saiu da seção',
    'cta_click': '👆 Clique CTA',
    'time_on_page': '⏱️ Tempo na página',
  };
  const label = labels[eventType] || eventType.replace(/_/g, ' ');
  return section ? `${label}: ${section}` : label;
};

// Cor do evento
const getEventColor = (eventType: string): string => {
  const colors: Record<string, string> = {
    'cart_add': 'bg-green-500',
    'cart_remove': 'bg-red-500',
    'cart_open': 'bg-yellow-500',
    'cart_opened': 'bg-yellow-500',
    'checkout_start': 'bg-orange-500',
    'checkout_started': 'bg-orange-500',
    'cta_click': 'bg-blue-500',
    'section_enter': 'bg-purple-400',
    'section_view': 'bg-purple-400',
    'page_view': 'bg-sky-400',
  };
  return colors[eventType] || 'bg-gray-400';
};

interface LiveStats {
  todayPageViews: number;
  todaySessions: number;
  lastHourViews: number;
  todayCheckouts: number;
  todayCartAdds: number;
}

const LiveVisitors = () => {
  const { visitors, isConnected, count } = useOnlineVisitors();
  const { recentEvents, checkoutAlerts } = useRealtimeAnalytics();
  const [stats, setStats] = useState<LiveStats>({
    todayPageViews: 0,
    todaySessions: 0,
    lastHourViews: 0,
    todayCheckouts: 0,
    todayCartAdds: 0,
  });

  // Buscar estatísticas do dia
  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const [pageViewsResult, sessionsResult, hourViewsResult, checkoutsResult, cartAddsResult] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', today.toISOString()),
        supabase
          .from('analytics_events')
          .select('session_id')
          .eq('event_type', 'page_view')
          .gte('created_at', today.toISOString()),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', oneHourAgo.toISOString()),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'checkout_started')
          .gte('created_at', today.toISOString()),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'cart_add')
          .gte('created_at', today.toISOString()),
      ]);

      const uniqueSessions = new Set(sessionsResult.data?.map(e => e.session_id) || []);

      setStats({
        todayPageViews: pageViewsResult.count || 0,
        todaySessions: uniqueSessions.size,
        lastHourViews: hourViewsResult.count || 0,
        todayCheckouts: checkoutsResult.count || 0,
        todayCartAdds: cartAddsResult.count || 0,
      });
    };

    fetchStats();
    
    // Atualizar a cada 60 segundos
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // Atualizar stats quando receber eventos em tempo real
  useEffect(() => {
    if (recentEvents.length > 0) {
      const latestEvent = recentEvents[0];
      if (latestEvent?.event_type === 'page_view') {
        setStats(prev => ({
          ...prev,
          todayPageViews: prev.todayPageViews + 1,
          lastHourViews: prev.lastHourViews + 1,
        }));
      }
      if (latestEvent?.event_type === 'checkout_started') {
        setStats(prev => ({
          ...prev,
          todayCheckouts: prev.todayCheckouts + 1,
        }));
      }
      if (latestEvent?.event_type === 'cart_add') {
        setStats(prev => ({
          ...prev,
          todayCartAdds: prev.todayCartAdds + 1,
        }));
      }
    }
  }, [recentEvents]);

  // Agrupar visitantes por página
  const visitorsByPage = visitors.reduce((acc, visitor) => {
    const page = visitor.page || '/';
    if (!acc[page]) acc[page] = [];
    acc[page].push(visitor);
    return acc;
  }, {} as Record<string, typeof visitors>);

  return (
    <div className="space-y-6">
      {/* Status de conexão */}
      <div className="flex items-center gap-2 text-sm">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-green-600">Conectado em tempo real</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-red-600">Desconectado</span>
          </>
        )}
      </div>

      {/* Cards de métricas em tempo real */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Visitantes Online Agora */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Agora</p>
                <AnimatePresence mode="wait">
                  <AnimatedCounter value={count} />
                </AnimatePresence>
              </div>
              <div className="relative">
                <Users className="h-8 w-8 text-primary" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Page Views Hoje */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Views Hoje</p>
                <p className="text-2xl font-bold">{stats.todayPageViews}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Sessões Hoje */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessões Hoje</p>
                <p className="text-2xl font-bold">{stats.todaySessions}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Carrinhos Hoje */}
        <Card className={stats.todayCartAdds > 0 ? 'border-green-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Add Carrinho</p>
                <p className="text-2xl font-bold">{stats.todayCartAdds}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha de cards - Checkouts com destaque */}
      <div className="grid grid-cols-1 gap-4">
        <Card className={checkoutAlerts.length > 0 ? 'ring-2 ring-orange-500 ring-offset-2 bg-orange-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Checkouts Hoje</p>
                <p className="text-2xl font-bold">{stats.todayCheckouts}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Checkout Recentes */}
      <AnimatePresence>
        {checkoutAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-orange-500/50 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                  <ShoppingCart className="h-4 w-4" />
                  Checkouts Recentes 🔥
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checkoutAlerts.slice(0, 3).map((alert, i) => (
                    <motion.div
                      key={alert.id || i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                      <span className="text-orange-800">
                        Novo checkout iniciado
                        {alert.utm_source && ` (via ${alert.utm_source})`}
                      </span>
                      <span className="text-orange-500 text-xs">
                        {new Date(alert.alertedAt).toLocaleTimeString('pt-BR')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Visitantes por Página */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Visitantes por Página
            </CardTitle>
          </CardHeader>
          <CardContent>
            {count === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nenhum visitante online no momento
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(visitorsByPage)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([page, pageVisitors]) => (
                    <div
                      key={page}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getPageName(page)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {pageVisitors.slice(0, 3).map((v, i) => (
                            <DeviceIcon key={i} type={v.deviceType} />
                          ))}
                        </div>
                        <Badge variant="secondary">{pageVisitors.length}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos em Tempo Real */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividade em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {recentEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Aguardando eventos...
                </p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {recentEvents.slice(0, 20).map((event, i) => (
                      <motion.div
                        key={event.id || i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30"
                      >
                        <span className={`w-2 h-2 rounded-full ${getEventColor(event.event_type)}`} />
                        <span className="flex-1 truncate">
                          {getEventLabel(event.event_type, event.section)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleTimeString('pt-BR')}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveVisitors;
