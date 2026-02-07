 import { useState, useEffect, useMemo } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   Users,
   Search,
   ShoppingBag,
   Clock,
   Phone,
   Mail,
   TrendingUp,
   Calendar,
   RefreshCw,
   Crown,
   Award,
 } from "lucide-react";
  import { formatDistanceToNow, format } from "date-fns";
  import { ptBR } from "date-fns/locale";
  import { useTenantConfig } from "@/hooks/useTenantConfig";
 
 interface CustomerData {
   email: string;
   name: string;
   phone: string;
   totalOrders: number;
   totalSpent: number;
   lastOrderDate: string | null;
   lastOrderStatus: string | null;
   firstOrderDate: string;
   avgOrderValue: number;
   lastActivity: string;
 }
 
 interface CustomersManagerProps {
   dateFilter?: 'today' | 'week' | 'month';
 }
 
 const STATUS_LABELS: Record<string, { label: string; color: string }> = {
   pending: { label: "Aguardando", color: "bg-yellow-500/10 text-yellow-600" },
   confirmed: { label: "Confirmado", color: "bg-green-500/10 text-green-600" },
   preparing: { label: "Preparando", color: "bg-blue-500/10 text-blue-600" },
   ready: { label: "Pronto", color: "bg-purple-500/10 text-purple-600" },
   delivering: { label: "Entregando", color: "bg-orange-500/10 text-orange-600" },
   delivered: { label: "Entregue", color: "bg-emerald-500/10 text-emerald-600" },
   cancelled: { label: "Cancelado", color: "bg-red-500/10 text-red-600" },
 };
 
  export default function CustomersManager({ dateFilter = 'month' }: CustomersManagerProps) {
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<'totalSpent' | 'totalOrders' | 'lastActivity'>('lastActivity');
    const { brand } = useTenantConfig();
 
   const fetchCustomers = async () => {
     setIsLoading(true);
     
     try {
       // Buscar todos os pedidos confirmados/entregues para agregar clientes
       const { data: orders, error } = await supabase
         .from('orders')
         .select('customer_email, customer_name, customer_phone, total, status, created_at, paid_at')
         .not('status', 'eq', 'cancelled')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
       // Agregar por email
       const customerMap = new Map<string, CustomerData>();
 
       orders?.forEach((order) => {
         const email = order.customer_email.toLowerCase();
         const existing = customerMap.get(email);
 
         if (existing) {
           existing.totalOrders += 1;
           existing.totalSpent += order.total || 0;
           
           // Atualizar último pedido se for mais recente
           if (!existing.lastOrderDate || new Date(order.created_at) > new Date(existing.lastOrderDate)) {
             existing.lastOrderDate = order.created_at;
             existing.lastOrderStatus = order.status;
             existing.lastActivity = order.created_at;
             existing.name = order.customer_name;
             existing.phone = order.customer_phone;
           }
           
           // Atualizar primeiro pedido se for mais antigo
           if (new Date(order.created_at) < new Date(existing.firstOrderDate)) {
             existing.firstOrderDate = order.created_at;
           }
           
           existing.avgOrderValue = existing.totalSpent / existing.totalOrders;
         } else {
           customerMap.set(email, {
             email,
             name: order.customer_name,
             phone: order.customer_phone,
             totalOrders: 1,
             totalSpent: order.total || 0,
             lastOrderDate: order.created_at,
             lastOrderStatus: order.status,
             firstOrderDate: order.created_at,
             avgOrderValue: order.total || 0,
             lastActivity: order.created_at,
           });
         }
       });
 
       setCustomers(Array.from(customerMap.values()));
     } catch (error) {
       console.error('Erro ao buscar clientes:', error);
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     fetchCustomers();
 
     // Realtime subscription para novos pedidos
     const channel = supabase
       .channel('customers-realtime')
       .on(
         'postgres_changes',
         { event: '*', schema: 'public', table: 'orders' },
         () => {
           fetchCustomers();
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, []);
 
   // Filtrar e ordenar
   const filteredCustomers = useMemo(() => {
     let filtered = customers;
 
     // Busca por nome, email ou telefone
     if (searchTerm) {
       const term = searchTerm.toLowerCase();
       filtered = filtered.filter(
         (c) =>
           c.name.toLowerCase().includes(term) ||
           c.email.toLowerCase().includes(term) ||
           c.phone.includes(term)
       );
     }
 
     // Ordenar
     return filtered.sort((a, b) => {
       if (sortBy === 'totalSpent') return b.totalSpent - a.totalSpent;
       if (sortBy === 'totalOrders') return b.totalOrders - a.totalOrders;
       return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
     });
   }, [customers, searchTerm, sortBy]);
 
   // Estatísticas
   const stats = useMemo(() => {
     const total = customers.length;
     const recorrentes = customers.filter((c) => c.totalOrders > 1).length;
     const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
     const avgTicket = total > 0 ? totalRevenue / customers.reduce((sum, c) => sum + c.totalOrders, 0) : 0;
     
     // Clientes ativos (pedido nos últimos 30 dias)
     const thirtyDaysAgo = new Date();
     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
     const ativos = customers.filter(
       (c) => c.lastOrderDate && new Date(c.lastOrderDate) >= thirtyDaysAgo
     ).length;
 
     return { total, recorrentes, totalRevenue, avgTicket, ativos };
   }, [customers]);
 
   const getCustomerTier = (customer: CustomerData) => {
     if (customer.totalOrders >= 10 || customer.totalSpent >= 2000) {
       return { label: "VIP", icon: Crown, color: "text-amber-500" };
     }
     if (customer.totalOrders >= 5 || customer.totalSpent >= 1000) {
       return { label: "Frequente", icon: Award, color: "text-purple-500" };
     }
     return null;
   };
 
    const openWhatsApp = (phone: string, name: string) => {
      const message = encodeURIComponent(
        `Olá ${name.split(' ')[0]}! Aqui é da ${brand.name} 🥗 Tudo bem com você?`
     );
     window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center py-12">
         <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       {/* Cards de estatísticas */}
       <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                 <Users className="w-5 h-5 text-primary" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{stats.total}</p>
                 <p className="text-xs text-muted-foreground">Total Clientes</p>
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
                 <p className="text-2xl font-bold">{stats.ativos}</p>
                 <p className="text-xs text-muted-foreground">Ativos (30d)</p>
               </div>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                 <Award className="w-5 h-5 text-purple-500" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{stats.recorrentes}</p>
                 <p className="text-xs text-muted-foreground">Recorrentes</p>
               </div>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                 <ShoppingBag className="w-5 h-5 text-emerald-500" />
               </div>
               <div>
                 <p className="text-2xl font-bold">
                   R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                 </p>
                 <p className="text-xs text-muted-foreground">Faturamento</p>
               </div>
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                 <TrendingUp className="w-5 h-5 text-orange-500" />
               </div>
               <div>
                 <p className="text-2xl font-bold">
                   R$ {stats.avgTicket.toFixed(0)}
                 </p>
                 <p className="text-xs text-muted-foreground">Ticket Médio</p>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Filtros e busca */}
       <Card>
         <CardHeader className="pb-3">
           <div className="flex flex-col sm:flex-row gap-4 justify-between">
             <CardTitle className="flex items-center gap-2">
               <Users className="w-5 h-5" />
               Clientes ({filteredCustomers.length})
             </CardTitle>
             <div className="flex gap-2">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <Input
                   placeholder="Buscar nome, email ou telefone..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9 w-64"
                 />
               </div>
               <Button
                 variant={sortBy === 'lastActivity' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setSortBy('lastActivity')}
               >
                 <Clock className="w-4 h-4 mr-1" />
                 Recentes
               </Button>
               <Button
                 variant={sortBy === 'totalSpent' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setSortBy('totalSpent')}
               >
                 <TrendingUp className="w-4 h-4 mr-1" />
                 Valor
               </Button>
               <Button
                 variant={sortBy === 'totalOrders' ? 'default' : 'outline'}
                 size="sm"
                 onClick={() => setSortBy('totalOrders')}
               >
                 <ShoppingBag className="w-4 h-4 mr-1" />
                 Pedidos
               </Button>
             </div>
           </div>
         </CardHeader>
         <CardContent>
           <div className="rounded-md border overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Cliente</TableHead>
                   <TableHead className="text-center">Pedidos</TableHead>
                   <TableHead className="text-center">Total Gasto</TableHead>
                   <TableHead className="text-center">Ticket Médio</TableHead>
                   <TableHead className="text-center">Último Pedido</TableHead>
                   <TableHead className="text-center">Status</TableHead>
                   <TableHead className="text-right">Ações</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredCustomers.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                       Nenhum cliente encontrado
                     </TableCell>
                   </TableRow>
                 ) : (
                   filteredCustomers.map((customer) => {
                     const tier = getCustomerTier(customer);
                     const statusInfo = customer.lastOrderStatus
                       ? STATUS_LABELS[customer.lastOrderStatus] || { label: customer.lastOrderStatus, color: "bg-muted" }
                       : null;
 
                     return (
                       <TableRow key={customer.email}>
                         <TableCell>
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                               {customer.name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                               <div className="flex items-center gap-2">
                                 <span className="font-medium">{customer.name}</span>
                                 {tier && (
                                   <tier.icon className={`w-4 h-4 ${tier.color}`} />
                                 )}
                               </div>
                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                 <Mail className="w-3 h-3" />
                                 {customer.email}
                               </div>
                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                 <Phone className="w-3 h-3" />
                                 {customer.phone}
                               </div>
                             </div>
                           </div>
                         </TableCell>
                         <TableCell className="text-center">
                           <Badge variant="secondary">{customer.totalOrders}</Badge>
                         </TableCell>
                         <TableCell className="text-center font-medium">
                           R$ {customer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </TableCell>
                         <TableCell className="text-center text-muted-foreground">
                           R$ {customer.avgOrderValue.toFixed(2)}
                         </TableCell>
                         <TableCell className="text-center">
                           {customer.lastOrderDate ? (
                             <div className="flex flex-col items-center">
                               <span className="text-xs">
                                 {format(new Date(customer.lastOrderDate), 'dd/MM/yyyy', { locale: ptBR })}
                               </span>
                               <span className="text-xs text-muted-foreground">
                                 {formatDistanceToNow(new Date(customer.lastOrderDate), {
                                   addSuffix: true,
                                   locale: ptBR,
                                 })}
                               </span>
                             </div>
                           ) : (
                             '-'
                           )}
                         </TableCell>
                         <TableCell className="text-center">
                           {statusInfo && (
                             <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                           )}
                         </TableCell>
                         <TableCell className="text-right">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => openWhatsApp(customer.phone, customer.name)}
                             className="text-green-600 hover:text-green-700"
                           >
                             <Phone className="w-4 h-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     );
                   })
                 )}
               </TableBody>
             </Table>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }