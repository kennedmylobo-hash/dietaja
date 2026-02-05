 import { useState, useMemo } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { toast } from "@/hooks/use-toast";
 import {
   Star,
   Check,
   X,
   MessageSquare,
   RefreshCw,
   Clock,
   TrendingUp,
   ExternalLink,
 } from "lucide-react";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 interface Review {
   id: string;
   order_id: string | null;
   customer_email: string;
   customer_name: string | null;
   rating: number;
   comment: string | null;
   is_approved: boolean;
   created_at: string;
 }
 
 const ReviewsManager = () => {
   const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending");
   const queryClient = useQueryClient();
 
   const { data: reviews, isLoading, refetch } = useQuery({
     queryKey: ["admin-reviews"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("reviews")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       return (data as Review[]) || [];
     },
   });
 
   const updateReviewMutation = useMutation({
     mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
       const { error } = await supabase
         .from("reviews")
         .update({ is_approved })
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
       toast({ title: "Avaliação atualizada!" });
     },
     onError: (error: any) => {
       toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
     },
   });
 
   const deleteReviewMutation = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("reviews").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
       toast({ title: "Avaliação removida!" });
     },
     onError: (error: any) => {
       toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
     },
   });
 
   const stats = useMemo(() => {
     if (!reviews) return { total: 0, pending: 0, approved: 0, avgRating: 0 };
 
     const total = reviews.length;
     const pending = reviews.filter((r) => !r.is_approved).length;
     const approved = reviews.filter((r) => r.is_approved).length;
     const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
 
     return { total, pending, approved, avgRating };
   }, [reviews]);
 
   const filteredReviews = useMemo(() => {
     if (!reviews) return [];
 
     switch (activeTab) {
       case "pending":
         return reviews.filter((r) => !r.is_approved);
       case "approved":
         return reviews.filter((r) => r.is_approved);
       default:
         return reviews;
     }
   }, [reviews, activeTab]);
 
   const renderStars = (rating: number) => (
     <div className="flex gap-0.5">
       {[1, 2, 3, 4, 5].map((star) => (
         <Star
           key={star}
           className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
         />
       ))}
     </div>
   );
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center py-12">
         <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold flex items-center gap-2">
           <Star className="h-5 w-5 text-yellow-500" />
           Avaliações de Clientes
         </h2>
         <Button variant="outline" size="sm" onClick={() => refetch()}>
           <RefreshCw className="h-4 w-4 mr-2" />
           Atualizar
         </Button>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card>
           <CardContent className="pt-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
               <MessageSquare className="h-4 w-4" />
               <span className="text-sm">Total</span>
             </div>
             <div className="text-2xl font-bold">{stats.total}</div>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
               <Clock className="h-4 w-4" />
               <span className="text-sm">Pendentes</span>
             </div>
             <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
               <Check className="h-4 w-4" />
               <span className="text-sm">Aprovadas</span>
             </div>
             <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
               <TrendingUp className="h-4 w-4" />
               <span className="text-sm">Média</span>
             </div>
             <div className="text-2xl font-bold flex items-center gap-2">
               {stats.avgRating.toFixed(1)}
               <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Tabs */}
       <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
         <TabsList>
           <TabsTrigger value="pending">
             Pendentes
             {stats.pending > 0 && (
               <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                 {stats.pending}
               </Badge>
             )}
           </TabsTrigger>
           <TabsTrigger value="approved">Aprovadas</TabsTrigger>
           <TabsTrigger value="all">Todas</TabsTrigger>
         </TabsList>
 
         <TabsContent value={activeTab} className="space-y-4 mt-4">
           {filteredReviews.length === 0 ? (
             <Card>
               <CardContent className="py-12 text-center text-muted-foreground">
                 <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                 <p>Nenhuma avaliação {activeTab === "pending" ? "pendente" : ""} encontrada</p>
               </CardContent>
             </Card>
           ) : (
             filteredReviews.map((review) => (
               <Card key={review.id}>
                 <CardContent className="pt-4">
                   <div className="flex items-start justify-between gap-4">
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                         {renderStars(review.rating)}
                         <Badge variant={review.is_approved ? "default" : "secondary"}>
                           {review.is_approved ? "Aprovada" : "Pendente"}
                         </Badge>
                       </div>
 
                       <p className="text-sm font-medium">
                         {review.customer_name || review.customer_email}
                       </p>
 
                       {review.comment && (
                         <p className="text-sm text-muted-foreground mt-2 italic">"{review.comment}"</p>
                       )}
 
                       <p className="text-xs text-muted-foreground mt-2">
                         {format(new Date(review.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                       </p>
                     </div>
 
                     <div className="flex gap-2">
                       {!review.is_approved && (
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-green-600 hover:bg-green-50"
                           onClick={() => updateReviewMutation.mutate({ id: review.id, is_approved: true })}
                           disabled={updateReviewMutation.isPending}
                         >
                           <Check className="h-4 w-4" />
                         </Button>
                       )}
                       {review.is_approved && (
                         <Button
                           size="sm"
                           variant="outline"
                           className="text-orange-600 hover:bg-orange-50"
                           onClick={() => updateReviewMutation.mutate({ id: review.id, is_approved: false })}
                           disabled={updateReviewMutation.isPending}
                         >
                           <X className="h-4 w-4" />
                         </Button>
                       )}
                       <Button
                         size="sm"
                         variant="outline"
                         className="text-red-600 hover:bg-red-50"
                         onClick={() => {
                           if (confirm("Remover esta avaliação?")) {
                             deleteReviewMutation.mutate(review.id);
                           }
                         }}
                         disabled={deleteReviewMutation.isPending}
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))
           )}
         </TabsContent>
       </Tabs>
     </div>
   );
 };
 
 export default ReviewsManager;