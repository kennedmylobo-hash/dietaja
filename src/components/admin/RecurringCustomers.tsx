 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import { Checkbox } from "@/components/ui/checkbox";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Calendar,
  MessageCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CustomerDetailDrawer from "./CustomerDetailDrawer";
 
 interface RecurringCustomer {
   id: string;
   customer_name: string;
   customer_phone: string;
   customer_email: string | null;
   delivery_day: string;
   default_order: string;
   delivery_option: string;
   delivery_address: string | null;
   notes: string | null;
   is_active: boolean;
   last_delivered_at: string | null;
   created_at: string;
 }
 
 const DAYS_OF_WEEK = [
   { value: "monday", label: "Segunda-feira", short: "Seg" },
   { value: "tuesday", label: "Terça-feira", short: "Ter" },
   { value: "wednesday", label: "Quarta-feira", short: "Qua" },
   { value: "thursday", label: "Quinta-feira", short: "Qui" },
   { value: "friday", label: "Sexta-feira", short: "Sex" },
   { value: "saturday", label: "Sábado", short: "Sáb" },
   { value: "sunday", label: "Domingo", short: "Dom" },
 ];
 
 const getDayLabel = (day: string) => {
   return DAYS_OF_WEEK.find((d) => d.value === day)?.label || day;
 };
 
 const getDayShort = (day: string) => {
   return DAYS_OF_WEEK.find((d) => d.value === day)?.short || day;
 };
 
 const getTodayDay = () => {
   const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
   return days[new Date().getDay()];
 };
 
 const getDayColor = (day: string) => {
   const colors: Record<string, string> = {
     monday: "bg-blue-500/10 text-blue-600 border-blue-200",
     tuesday: "bg-purple-500/10 text-purple-600 border-purple-200",
     wednesday: "bg-green-500/10 text-green-600 border-green-200",
     thursday: "bg-orange-500/10 text-orange-600 border-orange-200",
     friday: "bg-red-500/10 text-red-600 border-red-200",
     saturday: "bg-pink-500/10 text-pink-600 border-pink-200",
     sunday: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
   };
   return colors[day] || "bg-muted text-muted-foreground";
 };
 
 const RecurringCustomers = () => {
   const queryClient = useQueryClient();
   const [isFormOpen, setIsFormOpen] = useState(false);
   const [editingCustomer, setEditingCustomer] = useState<RecurringCustomer | null>(null);
   const [filterDay, setFilterDay] = useState<string>("all");
 
   // Form state
   const [formData, setFormData] = useState({
     customer_name: "",
     customer_phone: "",
     customer_email: "",
     delivery_day: "monday",
     default_order: "",
     delivery_option: "delivery",
     delivery_address: "",
     notes: "",
   });
 
   const todayDay = getTodayDay();
 
   // Fetch recurring customers
   const { data: customers = [], isLoading } = useQuery({
     queryKey: ["recurring-customers"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("recurring_customers")
         .select("*")
         .order("delivery_day")
         .order("customer_name");
 
       if (error) throw error;
       return data as RecurringCustomer[];
     },
   });
 
   // Filter customers
   const filteredCustomers = customers.filter((c) => {
     if (filterDay === "all") return true;
     return c.delivery_day === filterDay;
   });
 
   // Today's customers
   const todaysCustomers = customers.filter(
     (c) => c.delivery_day === todayDay && c.is_active
   );
 
   // Count by day
   const countByDay = DAYS_OF_WEEK.map((day) => ({
     ...day,
     count: customers.filter((c) => c.delivery_day === day.value && c.is_active).length,
   }));
 
   // Create/Update mutation
   const saveMutation = useMutation({
     mutationFn: async (data: typeof formData & { id?: string }) => {
       if (data.id) {
         const { error } = await supabase
           .from("recurring_customers")
           .update({
             customer_name: data.customer_name,
             customer_phone: data.customer_phone,
             customer_email: data.customer_email || null,
             delivery_day: data.delivery_day,
             default_order: data.default_order,
             delivery_option: data.delivery_option,
             delivery_address: data.delivery_address || null,
             notes: data.notes || null,
           })
           .eq("id", data.id);
         if (error) throw error;
       } else {
         const { error } = await supabase.from("recurring_customers").insert({
           customer_name: data.customer_name,
           customer_phone: data.customer_phone,
           customer_email: data.customer_email || null,
           delivery_day: data.delivery_day,
           default_order: data.default_order,
           delivery_option: data.delivery_option,
           delivery_address: data.delivery_address || null,
           notes: data.notes || null,
         });
         if (error) throw error;
       }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["recurring-customers"] });
       toast({
         title: editingCustomer ? "Cliente atualizado!" : "Cliente cadastrado!",
       });
       resetForm();
     },
     onError: (error: any) => {
       toast({
         title: "Erro ao salvar",
         description: error.message,
         variant: "destructive",
       });
     },
   });
 
   // Toggle active mutation
   const toggleActiveMutation = useMutation({
     mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
       const { error } = await supabase
         .from("recurring_customers")
         .update({ is_active })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["recurring-customers"] });
       toast({ title: "Status atualizado!" });
     },
   });
 
   // Mark as delivered mutation
   const markDeliveredMutation = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from("recurring_customers")
         .update({ last_delivered_at: new Date().toISOString() })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["recurring-customers"] });
       toast({ title: "Marcado como entregue!" });
     },
   });
 
   // Delete mutation
   const deleteMutation = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from("recurring_customers")
         .delete()
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["recurring-customers"] });
       toast({ title: "Cliente removido!" });
     },
   });
 
   const resetForm = () => {
     setFormData({
       customer_name: "",
       customer_phone: "",
       customer_email: "",
       delivery_day: "monday",
       default_order: "",
       delivery_option: "delivery",
       delivery_address: "",
       notes: "",
     });
     setEditingCustomer(null);
     setIsFormOpen(false);
   };
 
   const handleEdit = (customer: RecurringCustomer) => {
     setEditingCustomer(customer);
     setFormData({
       customer_name: customer.customer_name,
       customer_phone: customer.customer_phone,
       customer_email: customer.customer_email || "",
       delivery_day: customer.delivery_day,
       default_order: customer.default_order,
       delivery_option: customer.delivery_option,
       delivery_address: customer.delivery_address || "",
       notes: customer.notes || "",
     });
     setIsFormOpen(true);
   };
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     saveMutation.mutate({
       ...formData,
       id: editingCustomer?.id,
     });
   };
 
   const openWhatsApp = (phone: string, name: string) => {
     const message = encodeURIComponent(
       `Olá ${name}! Tudo bem? Seu pedido de hoje está pronto! 🍽️`
     );
     window.open(`https://wa.me/55${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
   };
 
   const wasDeliveredToday = (lastDelivered: string | null) => {
     if (!lastDelivered) return false;
     const today = new Date().toDateString();
     return new Date(lastDelivered).toDateString() === today;
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              Hoje é{" "}
              <span className="font-medium text-foreground">
                {getDayLabel(todayDay)}
              </span>
            </p>
          </div>
         <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
           <DialogTrigger asChild>
             <Button onClick={() => resetForm()}>
               <Plus className="w-4 h-4 mr-2" />
               Adicionar Cliente
             </Button>
           </DialogTrigger>
           <DialogContent className="max-w-md">
             <DialogHeader>
               <DialogTitle>
                 {editingCustomer ? "Editar Cliente" : "Novo Cliente Recorrente"}
               </DialogTitle>
             </DialogHeader>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="name">Nome *</Label>
                 <Input
                   id="name"
                   value={formData.customer_name}
                   onChange={(e) =>
                     setFormData({ ...formData, customer_name: e.target.value })
                   }
                   required
                 />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="phone">Telefone *</Label>
                   <Input
                     id="phone"
                     value={formData.customer_phone}
                     onChange={(e) =>
                       setFormData({ ...formData, customer_phone: e.target.value })
                     }
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="email">Email</Label>
                   <Input
                     id="email"
                     type="email"
                     value={formData.customer_email}
                     onChange={(e) =>
                       setFormData({ ...formData, customer_email: e.target.value })
                     }
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label>Dia de Entrega *</Label>
                 <div className="flex flex-wrap gap-2">
                   {DAYS_OF_WEEK.map((day) => (
                     <button
                       key={day.value}
                       type="button"
                       onClick={() =>
                         setFormData({ ...formData, delivery_day: day.value })
                       }
                       className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                         formData.delivery_day === day.value
                           ? "bg-primary text-primary-foreground border-primary"
                           : "bg-muted hover:bg-muted/80 border-transparent"
                       }`}
                     >
                       {day.short}
                     </button>
                   ))}
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="order">Pedido Padrão *</Label>
                 <Textarea
                   id="order"
                   value={formData.default_order}
                   onChange={(e) =>
                     setFormData({ ...formData, default_order: e.target.value })
                   }
                   placeholder="Ex: 10x Marmitas Fit, 5x Kit Detox..."
                   required
                 />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Tipo de Entrega</Label>
                   <Select
                     value={formData.delivery_option}
                     onValueChange={(value) =>
                       setFormData({ ...formData, delivery_option: value })
                     }
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="delivery">Delivery</SelectItem>
                       <SelectItem value="retirada">Retirada</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
 
               {formData.delivery_option === "delivery" && (
                 <div className="space-y-2">
                   <Label htmlFor="address">Endereço</Label>
                   <Input
                     id="address"
                     value={formData.delivery_address}
                     onChange={(e) =>
                       setFormData({ ...formData, delivery_address: e.target.value })
                     }
                   />
                 </div>
               )}
 
               <div className="space-y-2">
                 <Label htmlFor="notes">Observações</Label>
                 <Textarea
                   id="notes"
                   value={formData.notes}
                   onChange={(e) =>
                     setFormData({ ...formData, notes: e.target.value })
                   }
                   placeholder="Alguma observação especial..."
                 />
               </div>
 
               <div className="flex gap-2 pt-2">
                 <Button
                   type="button"
                   variant="outline"
                   onClick={resetForm}
                   className="flex-1"
                 >
                   Cancelar
                 </Button>
                 <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
                   {saveMutation.isPending ? "Salvando..." : "Salvar"}
                 </Button>
               </div>
             </form>
           </DialogContent>
         </Dialog>
       </div>
 
       {/* Week Overview */}
       <div className="flex gap-2 overflow-x-auto pb-2">
         {countByDay.map((day) => (
           <button
             key={day.value}
             onClick={() => setFilterDay(filterDay === day.value ? "all" : day.value)}
             className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
               day.value === todayDay
                 ? "ring-2 ring-primary ring-offset-2"
                 : ""
             } ${
               filterDay === day.value
                 ? "bg-primary text-primary-foreground border-primary"
                 : getDayColor(day.value)
             }`}
           >
             <div className="text-sm font-medium">{day.short}</div>
             <div className="text-lg font-bold">{day.count}</div>
           </button>
         ))}
       </div>
 
       {/* Today's Deliveries */}
       {todaysCustomers.length > 0 && (
         <Card className="border-primary/50 bg-primary/5">
           <CardHeader className="pb-3">
             <CardTitle className="flex items-center gap-2 text-lg">
               <Calendar className="w-5 h-5 text-primary" />
               Entregas de Hoje ({todaysCustomers.length})
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
               {todaysCustomers.map((customer) => {
                 const delivered = wasDeliveredToday(customer.last_delivered_at);
                 return (
                   <div
                     key={customer.id}
                     className={`flex items-center justify-between p-3 rounded-lg border ${
                       delivered
                         ? "bg-green-500/10 border-green-200"
                         : "bg-card border-border"
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       <Checkbox
                         checked={delivered}
                         onCheckedChange={() => {
                           if (!delivered) {
                             markDeliveredMutation.mutate(customer.id);
                           }
                         }}
                       />
                       <div>
                         <p className={`font-medium ${delivered ? "line-through text-muted-foreground" : ""}`}>
                           {customer.customer_name}
                         </p>
                         <p className="text-sm text-muted-foreground">
                           {customer.default_order}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <Badge variant={customer.delivery_option === "delivery" ? "default" : "secondary"}>
                         {customer.delivery_option === "delivery" ? (
                           <><MapPin className="w-3 h-3 mr-1" /> Delivery</>
                         ) : (
                           "Retirada"
                         )}
                       </Badge>
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => openWhatsApp(customer.customer_phone, customer.customer_name)}
                       >
                         <MessageCircle className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 );
               })}
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* All Customers Table */}
       <Card>
         <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
             <CardTitle className="text-lg">
               Todos os Clientes ({filteredCustomers.length})
             </CardTitle>
             {filterDay !== "all" && (
               <Button variant="ghost" size="sm" onClick={() => setFilterDay("all")}>
                 Limpar filtro
               </Button>
             )}
           </div>
         </CardHeader>
         <CardContent>
           {filteredCustomers.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
               <p>Nenhum cliente recorrente cadastrado</p>
               <p className="text-sm">Clique em "Adicionar Cliente" para começar</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Cliente</TableHead>
                     <TableHead>Dia</TableHead>
                     <TableHead>Pedido Padrão</TableHead>
                     <TableHead>Tipo</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="text-right">Ações</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredCustomers.map((customer) => (
                     <TableRow key={customer.id} className={!customer.is_active ? "opacity-50" : ""}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{customer.customer_name}</p>
                           <p className="text-sm text-muted-foreground flex items-center gap-1">
                             <Phone className="w-3 h-3" />
                             {customer.customer_phone}
                           </p>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge className={getDayColor(customer.delivery_day)}>
                           {getDayShort(customer.delivery_day)}
                         </Badge>
                       </TableCell>
                       <TableCell className="max-w-[200px] truncate">
                         {customer.default_order}
                       </TableCell>
                       <TableCell>
                         <Badge variant={customer.delivery_option === "delivery" ? "outline" : "secondary"}>
                           {customer.delivery_option === "delivery" ? "Delivery" : "Retirada"}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         {customer.is_active ? (
                           <Badge variant="default" className="bg-green-500">
                             <CheckCircle2 className="w-3 h-3 mr-1" />
                             Ativo
                           </Badge>
                         ) : (
                           <Badge variant="secondary">
                             <PauseCircle className="w-3 h-3 mr-1" />
                             Pausado
                           </Badge>
                         )}
                       </TableCell>
                       <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                           <Sheet>
                             <SheetTrigger asChild>
                               <Button size="icon" variant="ghost" title="Ver perfil completo">
                                 <Eye className="w-4 h-4" />
                               </Button>
                             </SheetTrigger>
                             <SheetContent className="overflow-y-auto sm:max-w-lg">
                               <SheetHeader>
                                 <SheetTitle>{customer.customer_name}</SheetTitle>
                               </SheetHeader>
                               <div className="mt-4">
                                 <CustomerDetailDrawer
                                   customerId={customer.id}
                                   customerName={customer.customer_name}
                                   customerPhone={customer.customer_phone}
                                 />
                               </div>
                             </SheetContent>
                           </Sheet>
                           <Button
                             size="icon"
                             variant="ghost"
                             onClick={() => openWhatsApp(customer.customer_phone, customer.customer_name)}
                           >
                             <MessageCircle className="w-4 h-4" />
                           </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(customer)}
                          >
                             <Edit2 className="w-4 h-4" />
                           </Button>
                           <Button
                             size="icon"
                             variant="ghost"
                             onClick={() =>
                               toggleActiveMutation.mutate({
                                 id: customer.id,
                                 is_active: !customer.is_active,
                               })
                             }
                           >
                             {customer.is_active ? (
                               <PauseCircle className="w-4 h-4" />
                             ) : (
                               <PlayCircle className="w-4 h-4" />
                             )}
                           </Button>
                           <Button
                             size="icon"
                             variant="ghost"
                             className="text-destructive hover:text-destructive"
                             onClick={() => {
                               if (confirm("Tem certeza que deseja excluir este cliente?")) {
                                 deleteMutation.mutate(customer.id);
                               }
                             }}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default RecurringCustomers;