import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, ShoppingCart, CreditCard, TrendingUp, Users, Target } from "lucide-react";

interface UTMCampaignReportProps {
  dateFilter: 'today' | 'week' | 'month';
}

interface CampaignRow {
  source: string;
  campaign: string;
  visitors: number;
  pageViews: number;
  cartAdds: number;
  checkoutStarts: number;
  orders: number;
  revenue: number;
  conversionRate: number;
}

const UTMCampaignReport = ({ dateFilter }: UTMCampaignReportProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'campaign' | 'source'>('campaign');

  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (dateFilter === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const startDate = getDateRange();

      const [eventsRes, ordersRes] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('session_id, event_type, utm_source, utm_campaign, section, created_at')
          .gte('created_at', startDate),
        supabase
          .from('orders')
          .select('id, utm_data, total, status, created_at')
          .gte('created_at', startDate)
          .neq('status', 'cancelled'),
      ]);

      setEvents(eventsRes.data || []);
      setOrders(ordersRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [dateFilter]);

  const campaigns = useMemo(() => {
    const map = new Map<string, CampaignRow>();

    const getKey = (source: string | null, campaign: string | null) => {
      const s = source || 'direto';
      const c = campaign || '(sem campanha)';
      return groupBy === 'source' ? s : `${s} / ${c}`;
    };

    // Process analytics events
    const sessionSources = new Map<string, { source: string | null; campaign: string | null }>();
    
    events.forEach(e => {
      if (e.utm_source) {
        sessionSources.set(e.session_id, { source: e.utm_source, campaign: e.utm_campaign });
      }
    });

    // Count unique visitors per campaign
    const visitorsByKey = new Map<string, Set<string>>();
    const pageViewsByKey = new Map<string, number>();
    const cartAddsByKey = new Map<string, Set<string>>();
    const checkoutByKey = new Map<string, Set<string>>();

    events.forEach(e => {
      const meta = sessionSources.get(e.session_id);
      // Only track sessions with UTM or group direct
      const source = meta?.source || e.utm_source || null;
      const campaign = meta?.campaign || e.utm_campaign || null;
      const key = getKey(source, campaign);

      if (!visitorsByKey.has(key)) visitorsByKey.set(key, new Set());
      if (!cartAddsByKey.has(key)) cartAddsByKey.set(key, new Set());
      if (!checkoutByKey.has(key)) checkoutByKey.set(key, new Set());

      if (e.event_type === 'page_view') {
        visitorsByKey.get(key)!.add(e.session_id);
        pageViewsByKey.set(key, (pageViewsByKey.get(key) || 0) + 1);
      }

      if (e.event_type === 'cta_click' || e.section === 'cart_add') {
        cartAddsByKey.get(key)!.add(e.session_id);
      }

      if (e.event_type === 'cta_click' && (e.section === 'checkout_start' || e.section === 'cart_open')) {
        checkoutByKey.get(key)!.add(e.session_id);
      }
    });

    // Build rows from visitors
    visitorsByKey.forEach((sessions, key) => {
      map.set(key, {
        source: key,
        campaign: key,
        visitors: sessions.size,
        pageViews: pageViewsByKey.get(key) || 0,
        cartAdds: cartAddsByKey.get(key)?.size || 0,
        checkoutStarts: checkoutByKey.get(key)?.size || 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
      });
    });

    // Process orders with UTM data
    orders.forEach(order => {
      const utm = order.utm_data as any;
      const source = utm?.utm_source || null;
      const campaign = utm?.utm_campaign || null;
      const key = getKey(source, campaign);

      if (!map.has(key)) {
        map.set(key, {
          source: key,
          campaign: key,
          visitors: 0,
          pageViews: 0,
          cartAdds: 0,
          checkoutStarts: 0,
          orders: 0,
          revenue: 0,
          conversionRate: 0,
        });
      }

      const row = map.get(key)!;
      row.orders += 1;
      row.revenue += Number(order.total) || 0;
    });

    // Calc conversion rates
    map.forEach(row => {
      row.conversionRate = row.visitors > 0 ? (row.orders / row.visitors) * 100 : 0;
    });

    return Array.from(map.values())
      .filter(r => r.source !== getKey(null, null) || r.visitors > 0) // keep direct only if has visitors
      .sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);
  }, [events, orders, groupBy]);

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => ({
        visitors: acc.visitors + c.visitors,
        cartAdds: acc.cartAdds + c.cartAdds,
        orders: acc.orders + c.orders,
        revenue: acc.revenue + c.revenue,
      }),
      { visitors: 0, cartAdds: 0, orders: 0, revenue: 0 }
    );
  }, [campaigns]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando relatório de campanhas...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5" />
          Relatório por Campanha UTM
        </h3>
        <Select value={groupBy} onValueChange={(v: 'campaign' | 'source') => setGroupBy(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="campaign">Por Campanha</SelectItem>
            <SelectItem value="source">Por Fonte</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xl font-bold">{totals.visitors}</p>
                <p className="text-xs text-muted-foreground">Visitantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xl font-bold">{totals.cartAdds}</p>
                <p className="text-xs text-muted-foreground">Add Carrinho</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xl font-bold">{totals.orders}</p>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xl font-bold">R$ {totals.revenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Receita</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign table */}
      <Card>
        <CardContent className="pt-4 p-0">
          {campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de campanha encontrado no período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      {groupBy === 'source' ? 'Fonte' : 'Campanha'}
                    </th>
                    <th className="px-3 py-3 font-medium text-muted-foreground text-center">
                      <Eye className="w-3.5 h-3.5 inline" /> Visitas
                    </th>
                    <th className="px-3 py-3 font-medium text-muted-foreground text-center">
                      <ShoppingCart className="w-3.5 h-3.5 inline" /> Carrinho
                    </th>
                    <th className="px-3 py-3 font-medium text-muted-foreground text-center">
                      <CreditCard className="w-3.5 h-3.5 inline" /> Pedidos
                    </th>
                    <th className="px-3 py-3 font-medium text-muted-foreground text-right">Receita</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground text-right">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate text-xs">{c.source}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{c.visitors}</td>
                      <td className="px-3 py-3 text-center">{c.cartAdds}</td>
                      <td className="px-3 py-3 text-center">
                        {c.orders > 0 ? (
                          <Badge variant="default" className="text-xs">{c.orders}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {c.revenue > 0 ? `R$ ${c.revenue.toFixed(0)}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {c.conversionRate > 0 ? (
                          <Badge variant={c.conversionRate >= 5 ? "default" : "secondary"} className="text-xs">
                            {c.conversionRate.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UTMCampaignReport;
