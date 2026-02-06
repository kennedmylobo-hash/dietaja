 import { useState, useEffect } from "react";
 import { useParams, Link } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { toast } from "@/hooks/use-toast";
 import { Star, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
 import Logo from "@/components/Logo";
 import { useTenantId } from "@/hooks/useTenantId";
 
 interface OrderInfo {
   order_number: string;
   customer_name: string;
   customer_email: string;
 }
 
 const Avaliar = () => {
   const tenantId = useTenantId();
   const { orderToken } = useParams<{ orderToken: string }>();
   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
   const [rating, setRating] = useState(0);
   const [hoveredRating, setHoveredRating] = useState(0);
   const [comment, setComment] = useState("");
 
   useEffect(() => {
     const decodeAndFetch = async () => {
       if (!orderToken) {
         setError("Link inválido");
         setLoading(false);
         return;
       }
 
       try {
         // Decode token: base64 of "orderId:email"
         const decoded = atob(orderToken);
         const [orderId, email] = decoded.split(":");
 
         if (!orderId || !email) {
           setError("Link inválido ou expirado");
           setLoading(false);
           return;
         }
 
         // Check if already reviewed
         const { data: existingReview } = await supabase
           .from("reviews")
           .select("id")
           .eq("order_id", orderId)
           .maybeSingle();
 
         if (existingReview) {
           setSubmitted(true);
           setLoading(false);
           return;
         }
 
         // Fetch order info
         const { data: order, error: orderError } = await supabase
           .from("orders")
           .select("order_number, customer_name, customer_email")
           .eq("id", orderId)
           .maybeSingle();
 
         if (orderError || !order) {
           setError("Pedido não encontrado");
           setLoading(false);
           return;
         }
 
         // Verify email matches
         if (order.customer_email.toLowerCase() !== email.toLowerCase()) {
           setError("Link inválido");
           setLoading(false);
           return;
         }
 
         setOrderInfo(order);
       } catch (e) {
         console.error("Error decoding token:", e);
         setError("Link inválido");
       } finally {
         setLoading(false);
       }
     };
 
     decodeAndFetch();
   }, [orderToken]);
 
   const handleSubmit = async () => {
     if (rating === 0) {
       toast({ title: "Selecione uma nota", variant: "destructive" });
       return;
     }
 
     if (!orderToken || !orderInfo) return;
 
     setSubmitting(true);
 
     try {
       const decoded = atob(orderToken);
       const [orderId] = decoded.split(":");
 
       const { error } = await supabase.from("reviews").insert({
         order_id: orderId,
         customer_email: orderInfo.customer_email,
         customer_name: orderInfo.customer_name,
         rating,
         comment: comment.trim() || null,
         tenant_id: tenantId,
       });
 
       if (error) throw error;
 
       setSubmitted(true);
       toast({ title: "Avaliação enviada! Obrigado! 🎉" });
     } catch (e: any) {
       console.error("Error submitting review:", e);
       toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
     } finally {
       setSubmitting(false);
     }
   };
 
   if (loading) {
     return (
       <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   if (error) {
     return (
       <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background">
         <div className="container max-w-md mx-auto px-4 py-12">
           <Card className="text-center">
             <CardContent className="pt-8 pb-6">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="text-3xl">❌</span>
               </div>
               <h2 className="text-xl font-semibold mb-2">Ops!</h2>
               <p className="text-muted-foreground">{error}</p>
               <Button asChild className="mt-6">
                 <Link to="/">
                   <ArrowLeft className="h-4 w-4 mr-2" />
                   Voltar ao Início
                 </Link>
               </Button>
             </CardContent>
           </Card>
         </div>
       </div>
     );
   }
 
   if (submitted) {
     return (
       <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background">
         <div className="container max-w-md mx-auto px-4 py-12">
           <div className="text-center mb-8">
             <Logo />
           </div>
 
           <Card className="text-center">
             <CardContent className="pt-8 pb-6">
               <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle className="h-10 w-10 text-green-600" />
               </div>
               <h2 className="text-2xl font-bold mb-2">Obrigado! 🎉</h2>
               <p className="text-muted-foreground">
                 Sua avaliação foi recebida e será publicada em breve.
               </p>
               <Button asChild className="mt-6">
                 <Link to="/">Ver Cardápio</Link>
               </Button>
             </CardContent>
           </Card>
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background">
       <div className="container max-w-md mx-auto px-4 py-8">
         <div className="text-center mb-6">
           <Logo />
         </div>
 
         <Card>
           <CardHeader className="text-center">
             <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
               <Star className="h-8 w-8 text-primary" />
             </div>
             <CardTitle className="text-xl">Como foi sua experiência?</CardTitle>
             <CardDescription>
               Olá {orderInfo?.customer_name?.split(" ")[0]}! Avalie seu pedido{" "}
               <strong>#{orderInfo?.order_number}</strong>
             </CardDescription>
           </CardHeader>
 
           <CardContent className="space-y-6">
             {/* Star Rating */}
             <div className="flex justify-center gap-2">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   type="button"
                   className="p-1 transition-transform hover:scale-110"
                   onMouseEnter={() => setHoveredRating(star)}
                   onMouseLeave={() => setHoveredRating(0)}
                   onClick={() => setRating(star)}
                 >
                   <Star
                     className={`h-10 w-10 transition-colors ${
                       star <= (hoveredRating || rating)
                         ? "fill-yellow-400 text-yellow-400"
                         : "text-gray-300"
                     }`}
                   />
                 </button>
               ))}
             </div>
 
             {rating > 0 && (
               <p className="text-center text-sm text-muted-foreground">
                 {rating === 1 && "😞 Muito ruim"}
                 {rating === 2 && "😕 Ruim"}
                 {rating === 3 && "😐 Regular"}
                 {rating === 4 && "😊 Bom"}
                 {rating === 5 && "🤩 Excelente!"}
               </p>
             )}
 
             {/* Comment */}
             <div className="space-y-2">
               <label className="text-sm font-medium">
                 Deixe um comentário <span className="text-muted-foreground">(opcional)</span>
               </label>
               <Textarea
                 placeholder="Conte-nos sobre sua experiência..."
                 value={comment}
                 onChange={(e) => setComment(e.target.value)}
                 rows={4}
               />
             </div>
 
             {/* Submit */}
             <Button
               className="w-full"
               size="lg"
               onClick={handleSubmit}
               disabled={rating === 0 || submitting}
             >
               {submitting ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Enviando...
                 </>
               ) : (
                 "Enviar Avaliação"
               )}
             </Button>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default Avaliar;