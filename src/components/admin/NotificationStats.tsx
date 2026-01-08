import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Mail,
  Check,
  Eye,
  MousePointer,
  XCircle,
  Send,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface NotificationEvent {
  id: string;
  created_at: string;
  channel: string;
  event_type: string;
  order_id: string | null;
  order_number: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  template_name: string | null;
  message_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface ChannelStats {
  sent: number;
  delivered: number;
  read: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
}

const NotificationStats = () => {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  const fetchEvents = async () => {
    setLoading(true);
    
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from('notification_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notification events:', error);
    } else {
      setEvents((data || []) as NotificationEvent[]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [dateRange]);

  // Calculate stats per channel
  const stats = useMemo(() => {
    const whatsapp: ChannelStats = { sent: 0, delivered: 0, read: 0, opened: 0, clicked: 0, failed: 0, bounced: 0 };
    const email: ChannelStats = { sent: 0, delivered: 0, read: 0, opened: 0, clicked: 0, failed: 0, bounced: 0 };

    events.forEach(event => {
      const target = event.channel === 'whatsapp' ? whatsapp : email;
      
      switch (event.event_type) {
        case 'sent':
          target.sent++;
          break;
        case 'delivered':
          target.delivered++;
          break;
        case 'read':
          target.read++;
          break;
        case 'opened':
          target.opened++;
          break;
        case 'clicked':
          target.clicked++;
          break;
        case 'failed':
          target.failed++;
          break;
        case 'bounced':
        case 'complained':
          target.bounced++;
          break;
      }
    });

    return { whatsapp, email };
  }, [events]);

  // Daily chart data
  const chartData = useMemo(() => {
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data: Array<{
      date: string;
      whatsapp_sent: number;
      whatsapp_delivered: number;
      email_sent: number;
      email_delivered: number;
    }> = [];

    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.created_at).toISOString().split('T')[0];
        return eventDate === dateStr;
      });

      data.push({
        date: displayDate,
        whatsapp_sent: dayEvents.filter(e => e.channel === 'whatsapp' && e.event_type === 'sent').length,
        whatsapp_delivered: dayEvents.filter(e => e.channel === 'whatsapp' && e.event_type === 'delivered').length,
        email_sent: dayEvents.filter(e => e.channel === 'email' && e.event_type === 'sent').length,
        email_delivered: dayEvents.filter(e => e.channel === 'email' && e.event_type === 'delivered').length,
      });
    }

    return data;
  }, [events, dateRange]);

  // Recent events for table
  const recentEvents = useMemo(() => events.slice(0, 50), [events]);

  const calcRate = (numerator: number, denominator: number) => {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100 * 10) / 10;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'sent': return <Send className="w-3 h-3" />;
      case 'delivered': return <Check className="w-3 h-3" />;
      case 'read': return <Eye className="w-3 h-3" />;
      case 'opened': return <Eye className="w-3 h-3" />;
      case 'clicked': return <MousePointer className="w-3 h-3" />;
      case 'failed': return <XCircle className="w-3 h-3" />;
      case 'bounced': return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getEventBadgeVariant = (eventType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (eventType) {
      case 'sent': return 'secondary';
      case 'delivered': return 'default';
      case 'read': 
      case 'opened':
      case 'clicked': return 'default';
      case 'failed':
      case 'bounced': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Estatísticas de Notificações
        </h2>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchEvents}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum evento registrado ainda</p>
            <p className="text-sm">Os eventos de notificação aparecerão aqui conforme forem enviados e processados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* WhatsApp Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">WhatsApp</span>
                </div>
                <p className="text-2xl font-bold">{stats.whatsapp.sent}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-medium">Entregues</span>
                </div>
                <p className="text-2xl font-bold">{stats.whatsapp.delivered}</p>
                <p className="text-xs text-muted-foreground">{calcRate(stats.whatsapp.delivered, stats.whatsapp.sent)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium">Lidos</span>
                </div>
                <p className="text-2xl font-bold">{stats.whatsapp.read}</p>
                <p className="text-xs text-muted-foreground">{calcRate(stats.whatsapp.read, stats.whatsapp.delivered)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Falhas</span>
                </div>
                <p className="text-2xl font-bold">{stats.whatsapp.failed}</p>
                <p className="text-xs text-muted-foreground">{calcRate(stats.whatsapp.failed, stats.whatsapp.sent)}%</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-950/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Taxa Leitura</span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {calcRate(stats.whatsapp.read, stats.whatsapp.sent)}%
                </p>
                <p className="text-xs text-muted-foreground">do total</p>
              </CardContent>
            </Card>
          </div>

          {/* Email Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">E-mail</span>
                </div>
                <p className="text-2xl font-bold">{stats.email.sent}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-medium">Entregues</span>
                </div>
                <p className="text-2xl font-bold">{stats.email.delivered}</p>
                <p className="text-xs text-muted-foreground">{calcRate(stats.email.delivered, stats.email.sent)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium">Abertos</span>
                </div>
                <p className="text-2xl font-bold">{stats.email.opened}</p>
                <p className="text-xs text-muted-foreground">{calcRate(stats.email.opened, stats.email.delivered)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <MousePointer className="w-4 h-4" />
                  <span className="text-xs font-medium">Cliques</span>
                </div>
                <p className="text-2xl font-bold">{stats.email.clicked}</p>
                <p className="text-xs text-muted-foreground">{calcRate(stats.email.clicked, stats.email.opened)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-medium">Bounces</span>
                </div>
                <p className="text-2xl font-bold">{stats.email.bounced + stats.email.failed}</p>
                <p className="text-xs text-muted-foreground">{calcRate(stats.email.bounced + stats.email.failed, stats.email.sent)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução de Envios</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.some(d => d.whatsapp_sent > 0 || d.email_sent > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="whatsapp_sent" name="WhatsApp" fill="#22c55e" />
                    <Bar dataKey="email_sent" name="E-mail" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <p>Sem dados para exibir no período</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Events Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Data/Hora</th>
                      <th className="pb-3 font-medium text-muted-foreground">Canal</th>
                      <th className="pb-3 font-medium text-muted-foreground">Evento</th>
                      <th className="pb-3 font-medium text-muted-foreground">Pedido</th>
                      <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Destinatário</th>
                      <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Template</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((event) => (
                      <tr key={event.id} className="border-b last:border-0">
                        <td className="py-3 text-muted-foreground">
                          {new Date(event.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3">
                          {event.channel === 'whatsapp' ? (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              <Mail className="w-3 h-3 mr-1" />
                              E-mail
                            </Badge>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge variant={getEventBadgeVariant(event.event_type)} className="gap-1">
                            {getEventIcon(event.event_type)}
                            {event.event_type}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {event.order_number ? (
                            <span className="font-mono text-xs">#{event.order_number}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 hidden md:table-cell text-muted-foreground text-xs">
                          {event.recipient_phone || event.recipient_email || '-'}
                        </td>
                        <td className="py-3 hidden lg:table-cell text-muted-foreground text-xs">
                          {event.template_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default NotificationStats;
