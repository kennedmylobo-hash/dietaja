import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Star, CheckCircle, Loader2, Camera, X, ThumbsUp, ThumbsDown } from "lucide-react";
import Logo from "@/components/Logo";
import MealBalanceSection from "@/components/feedback/MealBalanceSection";

interface TokenInfo {
  id: string;
  customer_name: string;
  tenant_id: string | null;
  recurring_customer_id: string | null;
}

const ClientFeedback = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [likedItems, setLikedItems] = useState("");
  const [dislikedItems, setDislikedItems] = useState("");
  const [observations, setObservations] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  // History
  const [previousFeedbacks, setPreviousFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    const fetchToken = async () => {
      if (!token) { setError("Link inválido"); setLoading(false); return; }

      const { data, error: err } = await supabase
        .rpc("get_feedback_token" as any, { _token: token })
        .maybeSingle();

      if (err || !data) {
        setError("Link inválido ou desativado");
        setLoading(false);
        return;
      }

      setTokenInfo(data);

      // Load previous feedbacks
      const { data: feedbacks } = await supabase
        .from("client_feedbacks")
        .select("*")
        .eq("token_id", data.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setPreviousFeedbacks(feedbacks || []);
      setLoading(false);
    };

    fetchToken();
  }, [token]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 3) {
      toast({ title: "Máximo 3 fotos", variant: "destructive" });
      return;
    }
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);
    setPhotoPreviewUrls(newPhotos.map(f => URL.createObjectURL(f)));
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviewUrls(newPhotos.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Selecione uma nota", variant: "destructive" });
      return;
    }
    if (!tokenInfo) return;

    setSubmitting(true);

    try {
      // Upload photos
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `${tokenInfo.id}/${Date.now()}-${photo.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("client-feedback-photos")
          .upload(fileName, photo);

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("client-feedback-photos")
            .getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      // Get current week reference
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekRef = `${weekStart.toISOString().split("T")[0]}`;

      const { error: insertErr } = await supabase.from("client_feedbacks").insert({
        token_id: tokenInfo.id,
        tenant_id: tokenInfo.tenant_id,
        rating,
        liked_items: likedItems.trim() || null,
        disliked_items: dislikedItems.trim() || null,
        observations: observations.trim() || null,
        photo_urls: uploadedUrls,
        week_reference: weekRef,
      });

      if (insertErr) throw insertErr;

      setSubmitted(true);
      toast({ title: "Feedback enviado! Obrigado! 🎉" });
    } catch (e: any) {
      console.error("Error submitting feedback:", e);
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Ops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Obrigado! 🎉</h2>
            <p className="text-muted-foreground mb-4">
              Seu feedback foi recebido. Vamos trabalhar para melhorar ainda mais sua experiência!
            </p>
            <Button onClick={() => { setSubmitted(false); setRating(0); setLikedItems(""); setDislikedItems(""); setObservations(""); setPhotos([]); setPhotoPreviewUrls([]); }}>
              Enviar Novo Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = tokenInfo?.customer_name?.split(" ")[0] || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background">
      <div className="container max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <Logo />
        </div>

        {/* Meal Balance Section */}
        {tokenInfo?.recurring_customer_id && (
          <MealBalanceSection customerId={tokenInfo.recurring_customer_id} />
        )}

        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Feedback Semanal</CardTitle>
            <CardDescription>
              Olá {firstName}! Como foi sua semana com nossas refeições?
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block text-center">Nota geral da semana</label>
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
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground mt-1">
                  {rating === 1 && "😞 Muito ruim"}
                  {rating === 2 && "😕 Ruim"}
                  {rating === 3 && "😐 Regular"}
                  {rating === 4 && "😊 Bom"}
                  {rating === 5 && "🤩 Excelente!"}
                </p>
              )}
            </div>

            {/* Liked */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                O que você gostou?
              </label>
              <Textarea
                placeholder="Ex: Frango grelhado estava ótimo, arroz no ponto..."
                value={likedItems}
                onChange={(e) => setLikedItems(e.target.value)}
                rows={3}
              />
            </div>

            {/* Disliked */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-destructive" />
                O que não gostou ou quer mudar?
              </label>
              <Textarea
                placeholder="Ex: Temperos cortados muito grandes, beterraba com azeite..."
                value={dislikedItems}
                onChange={(e) => setDislikedItems(e.target.value)}
                rows={3}
              />
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Observações gerais <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                placeholder="Qualquer detalhe que queira compartilhar..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos <span className="text-muted-foreground">(opcional, até 3)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {photoPreviewUrls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoAdd}
                    />
                  </label>
                )}
              </div>
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
                "Enviar Feedback"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Previous Feedbacks */}
        {previousFeedbacks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seus feedbacks anteriores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {previousFeedbacks.map((fb) => (
                <div key={fb.id} className="border border-border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${s <= fb.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(fb.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {fb.liked_items && (
                    <p className="text-xs"><span className="text-green-600">👍</span> {fb.liked_items}</p>
                  )}
                  {fb.disliked_items && (
                    <p className="text-xs"><span className="text-destructive">👎</span> {fb.disliked_items}</p>
                  )}
                  {fb.observations && (
                    <p className="text-xs text-muted-foreground mt-1">{fb.observations}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientFeedback;
