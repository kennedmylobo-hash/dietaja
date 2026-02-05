 import { useState, useMemo } from "react";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   DollarSign,
   Package,
   TrendingUp,
   Users,
   ArrowUp,
   ArrowDown,
   RefreshCw,
   Utensils,
   Droplets,
 } from "lucide-react";
 import {
   AreaChart,
   Area,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer,
   PieChart,
   Pie,
   Cell,
   BarChart,
   Bar,
   Legend,
 } from "recharts";
 
 interface KPIDashboardProps {
   dateFilter: "today" | "week" | "month";
 }
 
 const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
 
 const KPIDashboard = ({ dateFilter }: KPIDashboardProps) => {
   const [period, setPeriod] = useState<"day" | "week" | "month">("week");
 
   const getDateRange = (filter: string) => {
     const now = new Date();
     let start = new Date();
 
     switch (filter) {
       case "today":
       case "day":
         start.setHours(0, 0, 0, 0);
         break;
       case "week":
         start.setDate(now.getDate() - 7);
         break;
       case "month":
         start.setDate(now.getDate() - 30);
         break;
     }
 
     return { start: start.toISOString(), end: now.toISOString() };
   };
 
   const { data: orders, isLoading, refetch } = useQuery({
     queryKey: ["kpi-orders", dateFilter],
     queryFn: async () => {
       const { start } = getDateRange(dateFilter);
       const { data, error } = await supabase
         .from("orders")
         .select("*")
         .gte("created_at", start)
         .order("created_at", { ascending: true });
 
       if (error) throw error;
       return data || [];
     },
   });
 
   const { data: leads } = useQuery({
     queryKey: ["kpi-leads", dateFilter],
     queryFn: async () => {
       const { start } = getDateRange(dateFilter);
       const { data, error } = await supabase
         .from("leads")
         .select("id")
         .gte("created_at", start);
 
       if (error) throw error;
       return data || [];
     },
   });
 
   // Previous period data for comparison
   const { data: previousOrders } = useQuery({
     queryKey: ["kpi-orders-prev", dateFilter],
     queryFn: async () => {
       const days = dateFilter === "today" ? 1 : dateFilter === "week" ? 7 : 30;
       const now = new Date();
       const start = new Date();
       const end = new Date();
       start.setDate(now.getDate() - days * 2);
       end.setDate(now.getDate() - days);
 
       const { data, error } = await supabase
         .from("orders")
         .select("total, status")
         .gte("created_at", start.toISOString())
         .lt("created_at", end.toISOString());
 
       if (error) throw error;
       return data || [];
     },
   });
 
   const kpis = useMemo(() => {
     if (!orders) return null;
 
     const validOrders = orders.filter((o) => !["cancelled", "pending"].includes(o.status));
     const revenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
     const orderCount = validOrders.length;
     const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
 
     // Previous period
     const prevValidOrders = previousOrders?.filter((o) => !["cancelled", "pending"].includes(o.status)) || [];
     const prevRevenue = prevValidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
     const prevOrderCount = prevValidOrders.length;
 
     const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
     const ordersGrowth = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : 0;
 
     // Conversion rate
     const leadsCount = leads?.length || 0;
     const conversionRate = leadsCount > 0 ? (orderCount / leadsCount) * 100 : 0;
 
     // Revenue by category
     let marmitasRevenue = 0;
     let kitsRevenue = 0;
 
     validOrders.forEach((order) => {
       const items = order.items as any[];
       if (!Array.isArray(items)) return;
       items.forEach((item) => {
         if (item.type === "marmita") marmitasRevenue += item.totalPrice || 0;
         else if (item.type === "kit") kitsRevenue += item.totalPrice || 0;
       });
     });
 
     return {
       revenue,
       orderCount,
       avgTicket,
       revenueGrowth,
       ordersGrowth,
       conversionRate,
       marmitasRevenue,
       kitsRevenue,
     };
   }, [orders, previousOrders, leads]);
 
   // Daily chart data
   const chartData = useMemo(() => {
     if (!orders) return [];
 
     const days = dateFilter === "today" ? 1 : dateFilter === "week" ? 7 : 30;
     const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};
 
     for (let i = days - 1; i >= 0; i--) {
       const d = new Date();
       d.setDate(d.getDate() - i);
       const key = d.toISOString().split("T")[0];
       dailyData[key] = {
         date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
         revenue: 0,
         orders: 0,
       };
     }
 
     orders.forEach((order) => {
       if (["cancelled", "pending"].includes(order.status)) return;
       const key = order.created_at.split("T")[0];
       if (dailyData[key]) {
         dailyData[key].revenue += order.total || 0;
         dailyData[key].orders += 1;
       }
     });
 
     return Object.values(dailyData);
   }, [orders, dateFilter]);
 
   // Status distribution
   const statusData = useMemo(() => {
     if (!orders) return [];
 
     const counts: Record<string, number> = {};
     orders.forEach((order) => {
       counts[order.status] = (counts[order.status] || 0) + 1;
     });
 
     const statusLabels: Record<string, string> = {
       pending: "Pendente",
       approved: "Aprovado",
       preparing: "Preparando",
       ready: "Pronto",
       delivering: "Em Entrega",
       delivered: "Entregue",
       cancelled: "Cancelado",
     };
 
     return Object.entries(counts).map(([status, count]) => ({
       name: statusLabels[status] || status,
       value: count,
     }));
   }, [orders]);
 
   // Top products
   const topProducts = useMemo(() => {
     if (!orders) return [];
 
     const productCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
 
     orders.forEach((order) => {
       if (["cancelled", "pending"].includes(order.status)) return;
       const items = order.items as any[];
       if (!Array.isArray(items)) return;
 
       items.forEach((item) => {
         const key = item.name;
         if (!productCounts[key]) {
           productCounts[key] = { name: item.name, quantity: 0, revenue: 0 };
         }
         productCounts[key].quantity += item.quantity || 1;
         productCounts[key].revenue += item.totalPrice || 0;
       });
     });
 
     return Object.values(productCounts)
       .sort((a, b) => b.revenue - a.revenue)
       .slice(0, 5);
   }, [orders]);
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center py-12">
         <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   const formatCurrency = (value: number) =>
     value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold flex items-center gap-2">
           <TrendingUp className="h-5 w-5 text-primary" />
           Dashboard de KPIs
         </h2>
         <Button variant="outline" size="sm" onClick={() => refetch()}>
           <RefreshCw className="h-4 w-4 mr-2" />
           Atualizar
         </Button>
       </div>
 
       {/* KPI Cards */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <DollarSign className="h-4 w-4" />
               Receita Total
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(kpis?.revenue || 0)}</div>
             {kpis && kpis.revenueGrowth !== 0 && (
               <p className={`text-xs flex items-center gap-1 ${kpis.revenueGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                 {kpis.revenueGrowth > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                 {Math.abs(kpis.revenueGrowth).toFixed(1)}% vs período anterior
               </p>
             )}
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Package className="h-4 w-4" />
               Pedidos
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{kpis?.orderCount || 0}</div>
             {kpis && kpis.ordersGrowth !== 0 && (
               <p className={`text-xs flex items-center gap-1 ${kpis.ordersGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                 {kpis.ordersGrowth > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                 {Math.abs(kpis.ordersGrowth).toFixed(1)}% vs período anterior
               </p>
             )}
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <TrendingUp className="h-4 w-4" />
               Ticket Médio
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(kpis?.avgTicket || 0)}</div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Users className="h-4 w-4" />
               Conversão
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{(kpis?.conversionRate || 0).toFixed(1)}%</div>
             <p className="text-xs text-muted-foreground">Leads → Pedidos</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Category Revenue */}
       <div className="grid grid-cols-2 gap-4">
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Utensils className="h-4 w-4" />
               Marmitas
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-xl font-bold text-primary">{formatCurrency(kpis?.marmitasRevenue || 0)}</div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Droplets className="h-4 w-4" />
               Kits Detox
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-xl font-bold text-primary">{formatCurrency(kpis?.kitsRevenue || 0)}</div>
           </CardContent>
         </Card>
       </div>
 
       {/* Charts */}
       <div className="grid md:grid-cols-2 gap-6">
         {/* Revenue Chart */}
         <Card>
           <CardHeader>
             <CardTitle className="text-base">Receita Diária</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                       <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                   <XAxis dataKey="date" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                   <YAxis fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                   <Tooltip
                     formatter={(value: number) => formatCurrency(value)}
                     contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                   />
                   <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
 
         {/* Status Pie Chart */}
         <Card>
           <CardHeader>
             <CardTitle className="text-base">Pedidos por Status</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={statusData}
                     cx="50%"
                     cy="50%"
                     innerRadius={50}
                     outerRadius={80}
                     paddingAngle={2}
                     dataKey="value"
                     label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                     labelLine={false}
                   >
                     {statusData.map((_, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Top Products */}
       <Card>
         <CardHeader>
           <CardTitle className="text-base">Top 5 Produtos Mais Vendidos</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={topProducts} layout="vertical">
                 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                 <XAxis type="number" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                 <YAxis dataKey="name" type="category" width={120} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                 <Tooltip formatter={(value: number) => formatCurrency(value)} />
                 <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default KPIDashboard;