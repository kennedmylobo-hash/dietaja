 import { useState } from "react";
 import { isPast, parseISO, format } from "date-fns";
 import { ptBR } from "date-fns/locale";
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
  Minus,
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
  Link2,
  Package,
  History,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CustomerDetailDrawer from "./CustomerDetailDrawer";
import { useTenant } from "@/contexts/TenantContext";
 
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
  const [quickCreditCustomer, setQuickCreditCustomer] = useState<{id: string; name: string; phone: string} | null>(null);
    const [quickCreditQty, setQuickCreditQty] = useState("");
    const [quickCreditDate, setQuickCreditDate] = useState("");
    const [quickCreditNotes, setQuickCreditNotes] = useState("");
    const [quickWithdrawMode, setQuickWithdrawMode] = useState(false);
    const [showMovementHistory, setShowMovementHistory] = useState(false);
    const [batchMode, setBatchMode] = useState(false);
    const [batchRows, setBatchRows] = useState<Array<{date: string; qty: string}>>([{date: "", qty: ""}]);
  
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
 
    const { tenant } = useTenant();
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

    // Fetch meal credits for all customers (for saldo column)
    const { data: allCredits = [] } = useQuery({
      queryKey: ["all-meal-credits"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("customer_meal_credits")
          .select("*");
        if (error) throw error;
        return data;
      },
    });

    // Fetch withdrawals for selected customer
    const { data: customerWithdrawals = [] } = useQuery({
      queryKey: ["customer-withdrawals", quickCreditCustomer?.id],
      enabled: !!quickCreditCustomer,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("customer_meal_withdrawals")
          .select("*")
          .eq("customer_id", quickCreditCustomer!.id)
          .order("withdrawn_at", { ascending: false });
        if (error) throw error;
        return data;
      },
    });

    // Fetch feedback tokens for all customers
    const { data: allTokens = [] } = useQuery({
      queryKey: ["all-feedback-tokens"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("client_feedback_tokens")
          .select("recurring_customer_id, token")
          .eq("is_active", true);
        if (error) throw error;
        return data;
      },
    });

    // Helper: get remaining balance for a customer
    const getCustomerBalance = (customerId: string) => {
      return allCredits
        .filter(c => c.customer_id === customerId && c.remaining > 0 && (!c.expires_at || !isPast(parseISO(c.expires_at))))
        .reduce((sum, c) => sum + c.remaining, 0);
    };

    // Helper: get feedback token for a customer
    const getCustomerToken = (customerId: string) => {
      return allTokens.find(t => t.recurring_customer_id === customerId)?.token || null;
    };

    const getFeedbackLink = (token: string) => {
      const baseUrl = tenant?.domain ? `https://${tenant.domain}` : window.location.origin;
      return `${baseUrl}/feedback/${token}`;
    };

     const copyFeedbackLink = (token: string) => {
       navigator.clipboard.writeText(getFeedbackLink(token));
       toast({ title: "Link de avaliação copiado!" });
     };

     // Send WhatsApp notification helper
     const sendBalanceNotification = async (customerName: string, customerPhone: string, qty: number, newBalance: number, notes: string | null, isWithdrawal: boolean, customerId?: string) => {
       try {
         // Find feedback link for this customer
         let feedbackLink: string | null = null;
         if (customerId) {
           const token = getCustomerToken(customerId);
           if (token) {
             feedbackLink = getFeedbackLink(token);
           }
         }

         if (isWithdrawal) {
           await supabase.functions.invoke("send-meal-balance-notification", {
             body: {
               customer_name: customerName,
               customer_phone: customerPhone,
               withdrawn: qty,
               remaining: newBalance,
               notes: notes || null,
               feedback_link: feedbackLink,
             },
           });
         } else {
           await supabase.functions.invoke("send-meal-balance-notification", {
             body: {
               customer_name: customerName,
               customer_phone: customerPhone,
               added: qty,
               remaining: newBalance,
               notes: notes || null,
               feedback_link: feedbackLink,
             },
           });
         }
       } catch (e) {
         console.warn("Failed to send WhatsApp balance notification:", e);
       }
     };

     // Quick add credit mutation
     const quickAddCreditMutation = useMutation({
       mutationFn: async ({ customerId, qty, date, notes }: { customerId: string; qty: number; date: string; notes: string }) => {
         const { error } = await supabase.from("customer_meal_credits").insert({
           customer_id: customerId,
           quantity: qty,
           remaining: qty,
           notes: notes || null,
           created_at: date ? new Date(date + "T12:00:00").toISOString() : new Date().toISOString(),
         });
         if (error) throw error;

         // Calculate new balance
         const customerCredits = allCredits.filter(c => c.customer_id === customerId && c.remaining > 0 && (!c.expires_at || !isPast(parseISO(c.expires_at))));
         const currentBalance = customerCredits.reduce((sum: number, c: any) => sum + c.remaining, 0);
         const newBalance = currentBalance + qty;

         // Send WhatsApp
         if (quickCreditCustomer) {
           await sendBalanceNotification(quickCreditCustomer.name, quickCreditCustomer.phone, qty, newBalance, notes, false, customerId);
         }
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["all-meal-credits"] });
         toast({ title: "Saldo adicionado!" });
         resetQuickCredit();
       },
       onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
     });

     // Quick withdraw mutation
     const quickWithdrawMutation = useMutation({
       mutationFn: async ({ customerId, qty, date, notes }: { customerId: string; qty: number; date: string; notes: string }) => {
         const customerCredits = allCredits
           .filter(c => c.customer_id === customerId && c.remaining > 0 && (!c.expires_at || !isPast(parseISO(c.expires_at))))
           .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
         
         const totalRemaining = customerCredits.reduce((sum: number, c: any) => sum + c.remaining, 0);
         if (qty > totalRemaining) throw new Error(`Saldo insuficiente. Disponível: ${totalRemaining}`);

         let remaining = qty;
         for (const credit of customerCredits) {
           if (remaining <= 0) break;
           const debit = Math.min(remaining, credit.remaining);

           const { error: wErr } = await supabase.from("customer_meal_withdrawals").insert({
             credit_id: credit.id,
             customer_id: customerId,
             quantity: debit,
             notes: notes || null,
             withdrawn_at: date ? new Date(date + "T12:00:00").toISOString() : new Date().toISOString(),
           });
           if (wErr) throw wErr;

           const { error: uErr } = await supabase
             .from("customer_meal_credits")
             .update({ remaining: credit.remaining - debit })
             .eq("id", credit.id);
           if (uErr) throw uErr;

           remaining -= debit;
         }

         const newBalance = totalRemaining - qty;
         if (quickCreditCustomer) {
           await sendBalanceNotification(quickCreditCustomer.name, quickCreditCustomer.phone, qty, newBalance, notes, true, customerId);
         }
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["all-meal-credits"] });
         queryClient.invalidateQueries({ queryKey: ["customer-withdrawals"] });
         toast({ title: "Retirada registrada!" });
         resetQuickCredit();
       },
       onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
     });

     const resetQuickCredit = () => {
       setQuickCreditCustomer(null);
       setQuickCreditQty("");
       setQuickCreditDate("");
       setQuickCreditNotes("");
       setQuickWithdrawMode(false);
       setShowMovementHistory(false);
       setBatchMode(false);
       setBatchRows([{date: "", qty: ""}]);
     };

     // Batch withdraw mutation
     const batchWithdrawMutation = useMutation({
       mutationFn: async ({ customerId, rows, notes }: { customerId: string; rows: Array<{date: string; qty: number}>; notes: string }) => {
         const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);
         const customerCredits = allCredits
           .filter((c: any) => c.customer_id === customerId && c.remaining > 0 && (!c.expires_at || !isPast(parseISO(c.expires_at))))
           .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
         
         const totalRemaining = customerCredits.reduce((sum: number, c: any) => sum + c.remaining, 0);
         if (totalQty > totalRemaining) throw new Error(`Saldo insuficiente. Disponível: ${totalRemaining}, solicitado: ${totalQty}`);

         // Process each row as a withdrawal
         for (const row of rows) {
           let remaining = row.qty;
           const creditsCopy = allCredits
             .filter((c: any) => c.customer_id === customerId && c.remaining > 0 && (!c.expires_at || !isPast(parseISO(c.expires_at))))
             .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

           for (const credit of creditsCopy) {
             if (remaining <= 0) break;
             const debit = Math.min(remaining, credit.remaining);

             const { error: wErr } = await supabase.from("customer_meal_withdrawals").insert({
               credit_id: credit.id,
               customer_id: customerId,
               quantity: debit,
               notes: `Dia ${format(new Date(row.date + "T12:00:00"), "dd/MM")}: ${row.qty} marmitas${notes ? ` - ${notes}` : ""}`,
               withdrawn_at: new Date(row.date + "T12:00:00").toISOString(),
             });
             if (wErr) throw wErr;

             const { error: uErr } = await supabase
               .from("customer_meal_credits")
               .update({ remaining: credit.remaining - debit })
               .eq("id", credit.id);
             if (uErr) throw uErr;

             credit.remaining -= debit;
             remaining -= debit;
           }
         }

         const newBalance = totalRemaining - totalQty;

         // Send consolidated WhatsApp with all movements listed
         if (quickCreditCustomer) {
           try {
             let feedbackLink: string | null = null;
             const token = getCustomerToken(customerId);
             if (token) feedbackLink = getFeedbackLink(token);

             const movementLines = rows.map(r => `📦 Dia ${format(new Date(r.date + "T12:00:00"), "dd/MM")}: ${r.qty} marmita${r.qty > 1 ? "s" : ""}`).join("\n");
             
             const firstName = quickCreditCustomer.name.split(" ")[0];
             const feedbackLine = feedbackLink ? `\n⭐ *Avalie suas refeições:*\n${feedbackLink}\n` : "";
             const lowBalanceAlert = newBalance <= 5 && newBalance > 0 ? "\n⚠️ Seu saldo está acabando! Fale conosco para renovar." : "";
             const zeroAlert = newBalance === 0 ? "\n🔄 Seu saldo zerou! Entre em contato para fazer um novo pedido." : "";

             const message = `Oi ${firstName}! 📦\n\n*Movimentação registrada:*\n${movementLines}\n\n🍽️ *Saldo atual: ${newBalance} marmita${newBalance !== 1 ? "s" : ""}*\n${feedbackLine}${lowBalanceAlert}${zeroAlert}\nQualquer dúvida, estamos à disposição! 💚`;

             await supabase.functions.invoke("send-meal-balance-notification", {
               body: {
                 customer_name: quickCreditCustomer.name,
                 customer_phone: quickCreditCustomer.phone,
                 withdrawn: totalQty,
                 remaining: newBalance,
                 notes: `Lote: ${rows.length} retirada(s)`,
                 feedback_link: feedbackLink,
                 custom_message: message,
               },
             });
           } catch (e) {
             console.warn("Failed to send batch WhatsApp notification:", e);
           }
         }
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ["all-meal-credits"] });
         queryClient.invalidateQueries({ queryKey: ["customer-withdrawals"] });
         toast({ title: "Lote de retiradas registrado!" });
         resetQuickCredit();
       },
       onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
     });

     // Generate feedback token for customer
     const generateTokenMutation = useMutation({
       mutationFn: async (customer: RecurringCustomer) => {
         const { data, error } = await supabase
           .from("client_feedback_tokens")
           .insert({
             recurring_customer_id: customer.id,
             customer_name: customer.customer_name,
             customer_phone: customer.customer_phone,
             tenant_id: tenant?.id || "00000000-0000-0000-0000-000000000001",
           })
           .select("token")
           .single();
         if (error) throw error;
         return data.token as string;
       },
       onSuccess: (token) => {
         queryClient.invalidateQueries({ queryKey: ["all-feedback-tokens"] });
         navigator.clipboard.writeText(getFeedbackLink(token));
         toast({ title: "Link gerado e copiado!" });
       },
       onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
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
                      <TableHead>Saldo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const balance = getCustomerBalance(customer.id);
                      const token = getCustomerToken(customer.id);
                      return (
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
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={balance > 5 ? "outline" : balance > 0 ? "secondary" : "destructive"}
                              className="gap-1"
                            >
                              <Package className="w-3 h-3" />
                              {balance}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => setQuickCreditCustomer({ id: customer.id, name: customer.customer_name, phone: customer.customer_phone })}
                              title="Adicionar saldo"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
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
                          <TooltipProvider delayDuration={300}>
                           <div className="flex items-center justify-end gap-1">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Perfil / Marmitas / Avaliação</TooltipContent>
                                </Tooltip>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => token ? copyFeedbackLink(token) : generateTokenMutation.mutate(customer)}
                                  disabled={generateTokenMutation.isPending}
                                >
                                  <Link2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{token ? "Copiar link de avaliação" : "Gerar link de avaliação"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openWhatsApp(customer.customer_phone, customer.customer_name)}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>WhatsApp</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEdit(customer)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                              </TooltipTrigger>
                              <TooltipContent>{customer.is_active ? "Pausar" : "Ativar"}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
             </div>
           )}
         </CardContent>
       </Card>

         {/* Quick Credit/Withdraw Dialog */}
         <Dialog open={!!quickCreditCustomer} onOpenChange={(open) => { if (!open) resetQuickCredit(); }}>
           <DialogContent className="max-w-md">
             <DialogHeader>
               <DialogTitle>
                 {batchMode ? "Baixa em Lote" : quickWithdrawMode ? "Registrar Retirada" : "Adicionar Saldo"}
               </DialogTitle>
             </DialogHeader>
             <div className="flex items-center justify-between">
               <p className="text-sm text-muted-foreground">{quickCreditCustomer?.name}</p>
               {quickCreditCustomer && (
                 <Badge variant="outline" className="gap-1">
                   <Package className="w-3 h-3" />
                   Saldo: {getCustomerBalance(quickCreditCustomer.id)}
                 </Badge>
               )}
             </div>

             {/* Toggle between add, withdraw, and batch */}
             <div className="flex gap-2">
               <Button
                 type="button"
                 variant={!quickWithdrawMode && !batchMode ? "default" : "outline"}
                 size="sm"
                 className="flex-1"
                 onClick={() => { setQuickWithdrawMode(false); setBatchMode(false); }}
               >
                 <Plus className="w-4 h-4 mr-1" /> Acrescentar
               </Button>
               <Button
                 type="button"
                 variant={quickWithdrawMode && !batchMode ? "default" : "outline"}
                 size="sm"
                 className="flex-1"
                 onClick={() => { setQuickWithdrawMode(true); setBatchMode(false); }}
               >
                 <Minus className="w-4 h-4 mr-1" /> Retirar
               </Button>
               <Button
                 type="button"
                 variant={batchMode ? "default" : "outline"}
                 size="sm"
                 className="flex-1"
                 onClick={() => { setBatchMode(true); setQuickWithdrawMode(true); }}
               >
                 <History className="w-4 h-4 mr-1" /> Lote
               </Button>
             </div>

             {/* Batch mode UI */}
             {batchMode ? (
               <div className="space-y-3">
                 <p className="text-xs text-muted-foreground">Registre múltiplas retiradas de uma vez. Cada linha é uma data com quantidade.</p>
                 <div className="space-y-2 max-h-48 overflow-y-auto">
                   {batchRows.map((row, i) => (
                     <div key={i} className="flex items-center gap-2">
                       <Input
                         type="date"
                         value={row.date}
                         onChange={(e) => {
                           const newRows = [...batchRows];
                           newRows[i].date = e.target.value;
                           setBatchRows(newRows);
                         }}
                         className="flex-1"
                         required
                       />
                       <Input
                         type="number"
                         min="1"
                         value={row.qty}
                         onChange={(e) => {
                           const newRows = [...batchRows];
                           newRows[i].qty = e.target.value;
                           setBatchRows(newRows);
                         }}
                         placeholder="Qtd"
                         className="w-20"
                         required
                       />
                       {batchRows.length > 1 && (
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8 shrink-0"
                           onClick={() => setBatchRows(batchRows.filter((_, j) => j !== i))}
                         >
                           <Trash2 className="w-3 h-3" />
                         </Button>
                       )}
                     </div>
                   ))}
                 </div>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   className="w-full"
                   onClick={() => setBatchRows([...batchRows, {date: "", qty: ""}])}
                 >
                   <Plus className="w-3 h-3 mr-1" /> Adicionar linha
                 </Button>
                 {batchRows.some(r => r.date && r.qty) && (
                   <div className="text-sm text-muted-foreground border rounded-lg p-2">
                     <p className="font-medium mb-1">Resumo:</p>
                     {batchRows.filter(r => r.date && r.qty).map((r, i) => (
                       <p key={i}>📦 Dia {r.date ? format(new Date(r.date + "T12:00:00"), "dd/MM") : "?"}: {r.qty} marmita{parseInt(r.qty) > 1 ? "s" : ""}</p>
                     ))}
                     <p className="font-medium mt-1 border-t pt-1">
                       Total: {batchRows.filter(r => r.qty).reduce((sum, r) => sum + (parseInt(r.qty) || 0), 0)} marmitas
                     </p>
                   </div>
                 )}
                 <div className="space-y-1">
                   <Label>Observação</Label>
                   <Input
                     value={quickCreditNotes}
                     onChange={(e) => setQuickCreditNotes(e.target.value)}
                     placeholder="Ex: Retiradas da semana"
                   />
                 </div>
                 <Button 
                   className="w-full" 
                   variant="destructive"
                   disabled={batchWithdrawMutation.isPending || !batchRows.some(r => r.date && r.qty)}
                   onClick={() => {
                     if (!quickCreditCustomer) return;
                     const validRows = batchRows
                       .filter(r => r.date && r.qty && parseInt(r.qty) > 0)
                       .map(r => ({ date: r.date, qty: parseInt(r.qty) }));
                     if (validRows.length === 0) return;
                     batchWithdrawMutation.mutate({ customerId: quickCreditCustomer.id, rows: validRows, notes: quickCreditNotes });
                   }}
                 >
                   {batchWithdrawMutation.isPending ? "Processando..." : `Confirmar ${batchRows.filter(r => r.date && r.qty).length} retirada(s)`}
                 </Button>
               </div>
             ) : (
               /* Single mode form */
               <form
                 onSubmit={(e) => {
                   e.preventDefault();
                   const qty = parseInt(quickCreditQty);
                   if (qty > 0 && quickCreditCustomer) {
                     if (quickWithdrawMode) {
                       quickWithdrawMutation.mutate({ customerId: quickCreditCustomer.id, qty, date: quickCreditDate, notes: quickCreditNotes });
                     } else {
                       quickAddCreditMutation.mutate({ customerId: quickCreditCustomer.id, qty, date: quickCreditDate, notes: quickCreditNotes });
                     }
                   }
                 }}
                 className="space-y-3"
               >
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <Label>Data</Label>
                     <Input
                       type="date"
                       value={quickCreditDate}
                       onChange={(e) => setQuickCreditDate(e.target.value)}
                     />
                     <p className="text-xs text-muted-foreground">Vazio = hoje</p>
                   </div>
                   <div className="space-y-1">
                     <Label>Quantidade *</Label>
                     <Input
                       type="number"
                       min="1"
                       max={quickWithdrawMode && quickCreditCustomer ? getCustomerBalance(quickCreditCustomer.id) : undefined}
                       value={quickCreditQty}
                       onChange={(e) => setQuickCreditQty(e.target.value)}
                       placeholder="Ex: 18"
                       required
                       autoFocus
                     />
                   </div>
                 </div>
                 <div className="space-y-1">
                   <Label>Observação</Label>
                   <Input
                     value={quickCreditNotes}
                     onChange={(e) => setQuickCreditNotes(e.target.value)}
                     placeholder={quickWithdrawMode ? "Ex: Retirada semanal" : "Ex: Pago via Pix"}
                   />
                 </div>
                 <Button 
                   type="submit" 
                   className="w-full" 
                   disabled={quickAddCreditMutation.isPending || quickWithdrawMutation.isPending}
                   variant={quickWithdrawMode ? "destructive" : "default"}
                 >
                   {(quickAddCreditMutation.isPending || quickWithdrawMutation.isPending)
                     ? "Processando..."
                     : quickWithdrawMode
                       ? "Confirmar Retirada"
                       : "Adicionar Saldo"
                   }
                 </Button>
               </form>
             )}

             {/* Movement History */}
             <Button
               variant="ghost"
               size="sm"
               className="w-full"
               onClick={() => setShowMovementHistory(!showMovementHistory)}
             >
               <History className="w-4 h-4 mr-1" />
               {showMovementHistory ? "Ocultar histórico" : "Ver histórico de movimentações"}
             </Button>

             {showMovementHistory && quickCreditCustomer && (
               <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2">
                 {/* Unified timeline sorted by date */}
                 {[
                   ...allCredits
                     .filter((c: any) => c.customer_id === quickCreditCustomer.id)
                     .map((c: any) => ({ type: "add" as const, date: new Date(c.created_at), qty: c.quantity, notes: c.notes, id: c.id })),
                   ...customerWithdrawals.map((w: any) => ({ type: "withdraw" as const, date: new Date(w.withdrawn_at), qty: w.quantity, notes: w.notes, id: w.id })),
                 ]
                   .sort((a, b) => b.date.getTime() - a.date.getTime())
                   .map((item) => (
                     <div key={item.id} className={`flex justify-between items-center p-2 rounded border text-sm ${item.type === "add" ? "bg-primary/5" : "bg-destructive/5"}`}>
                       <div>
                         <span className={`font-medium ${item.type === "add" ? "text-primary" : "text-destructive"}`}>
                           {item.type === "add" ? "+" : "-"}{item.qty} marmitas
                         </span>
                         {item.notes && <span className="text-muted-foreground ml-2 text-xs">({item.notes})</span>}
                       </div>
                       <span className="text-muted-foreground text-xs">
                         {format(item.date, "dd/MM/yy")}
                       </span>
                     </div>
                   ))
                 }
                 {allCredits.filter((c: any) => c.customer_id === quickCreditCustomer.id).length === 0 &&
                   customerWithdrawals.length === 0 && (
                   <p className="text-center text-muted-foreground text-sm py-4">Nenhuma movimentação</p>
                 )}
               </div>
             )}
           </DialogContent>
         </Dialog>
       </div>
     );
   };
 
 export default RecurringCustomers;