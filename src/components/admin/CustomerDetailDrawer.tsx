import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Minus, Package, AlertTriangle, Clock, History,
  Star, Copy, MessageCircle, ExternalLink, Loader2, Trash2,
  Link2, ThumbsUp, ThumbsDown, Calendar,
} from "lucide-react";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTenant } from "@/contexts/TenantContext";

interface Props {
  customerId: string;
  customerName: string;
  customerPhone: string;
}

interface MealCredit {
  id: string;
  quantity: number;
  remaining: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface MealWithdrawal {
  id: string;
  credit_id: string;
  quantity: number;
  withdrawn_at: string;
  notes: string | null;
}

interface Feedback {
  id: string;
  rating: number;
  liked_items: string | null;
  disliked_items: string | null;
  observations: string | null;
  week_reference: string | null;
  created_at: string;
}

interface BatchRow {
  date: string;
  quantity: string;
}

const CustomerDetailDrawer = ({ customerId, customerName, customerPhone }: Props) => {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  // Meal credits state
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [isBatchWithdrawOpen, setIsBatchWithdrawOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creditForm, setCreditForm] = useState({ quantity: "", expires_at: "", notes: "" });

  // Batch withdrawal rows
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { date: new Date().toISOString().split("T")[0], quantity: "" },
  ]);

  // Feedback state
  const [feedbackToken, setFeedbackToken] = useState<string | null>(null);
  const [feedbackTokenLoading, setFeedbackTokenLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  // Fetch credits
  const { data: credits = [] } = useQuery({
    queryKey: ["meal-credits", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_meal_credits")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MealCredit[];
    },
  });

  // Fetch withdrawals
  const { data: withdrawals = [] } = useQuery({
    queryKey: ["meal-withdrawals", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_meal_withdrawals")
        .select("*")
        .eq("customer_id", customerId)
        .order("withdrawn_at", { ascending: false });
      if (error) throw error;
      return data as MealWithdrawal[];
    },
  });

  // Load or create feedback token
  useEffect(() => {
    const loadToken = async () => {
      setFeedbackTokenLoading(true);

      // Check if token exists
      const { data: existing } = await supabase
        .from("client_feedback_tokens")
        .select("id, token")
        .eq("recurring_customer_id", customerId)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        setFeedbackToken(existing.token);
        // Load feedbacks
        const { data: fbs } = await supabase
          .from("client_feedbacks")
          .select("*")
          .eq("token_id", existing.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setFeedbacks((fbs || []) as Feedback[]);
      } else {
        // Auto-create token for this customer
        const { data: created, error } = await supabase
          .from("client_feedback_tokens")
          .insert({
            recurring_customer_id: customerId,
            customer_name: customerName,
            customer_phone: customerPhone,
            tenant_id: tenant?.id || "00000000-0000-0000-0000-000000000001",
          })
          .select("token")
          .single();

        if (!error && created) {
          setFeedbackToken(created.token);
        }
      }

      setFeedbackTokenLoading(false);
    };
    loadToken();
  }, [customerId]);

  // Active credits
  const activeCredits = credits.filter(c => {
    if (c.remaining <= 0) return false;
    if (c.expires_at && isPast(parseISO(c.expires_at))) return false;
    return true;
  });

  const totalRemaining = activeCredits.reduce((sum, c) => sum + c.remaining, 0);
  const totalPurchased = credits.reduce((sum, c) => sum + c.quantity, 0);
  const totalUsed = totalPurchased - credits.reduce((sum, c) => sum + c.remaining, 0);

  const nearestExpiry = activeCredits
    .filter(c => c.expires_at)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())[0];
  const daysToExpiry = nearestExpiry?.expires_at
    ? differenceInDays(parseISO(nearestExpiry.expires_at), new Date())
    : null;

  // Feedback link
  const getFeedbackLink = () => {
    if (!feedbackToken) return "";
    const baseUrl = tenant?.domain ? `https://${tenant.domain}` : window.location.origin;
    return `${baseUrl}/feedback/${feedbackToken}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getFeedbackLink());
    toast({ title: "Link copiado!" });
  };

  const shareFeedbackWhatsApp = () => {
    const link = getFeedbackLink();
    const firstName = customerName.split(" ")[0];
    const message = encodeURIComponent(
      `Olá ${firstName}! 😊\n\nComo foi sua semana com nossas refeições? Seu feedback é muito importante!\n\nAcesse: ${link}`
    );
    const phone = customerPhone.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  // Add credit mutation
  const addCreditMutation = useMutation({
    mutationFn: async () => {
      const qty = parseInt(creditForm.quantity);
      if (!qty || qty <= 0) throw new Error("Quantidade inválida");
      const { error } = await supabase.from("customer_meal_credits").insert({
        customer_id: customerId,
        quantity: qty,
        remaining: qty,
        expires_at: creditForm.expires_at || null,
        notes: creditForm.notes || null,
      });
      if (error) throw error;

      // Send welcome message if this is the first batch
      const isFirstBatch = credits.length === 0;
      if (isFirstBatch) {
        try {
          await supabase.functions.invoke("send-welcome-meal-customer", {
            body: {
              customer_name: customerName,
              customer_phone: customerPhone,
              quantity: qty,
              feedback_link: feedbackToken ? getFeedbackLink() : null,
              brand_name: tenant?.brand_name || null,
            },
          });
        } catch (e) {
          console.warn("Failed to send welcome message:", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-credits", customerId] });
      toast({ title: "Lote adicionado!" });
      setCreditForm({ quantity: "", expires_at: "", notes: "" });
      setIsAddCreditOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // Batch withdraw mutation
  const batchWithdrawMutation = useMutation({
    mutationFn: async () => {
      const validRows = batchRows.filter(r => r.quantity && parseInt(r.quantity) > 0);
      if (validRows.length === 0) throw new Error("Nenhuma retirada válida");

      const totalToWithdraw = validRows.reduce((s, r) => s + parseInt(r.quantity), 0);
      if (totalToWithdraw > totalRemaining) {
        throw new Error(`Saldo insuficiente. Disponível: ${totalRemaining}, Solicitado: ${totalToWithdraw}`);
      }

      // Process each row as a separate withdrawal with its date
      for (const row of validRows) {
        const qty = parseInt(row.quantity);
        let remaining = qty;

        const sorted = [...activeCredits].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (const credit of sorted) {
          if (remaining <= 0) break;
          const debit = Math.min(remaining, credit.remaining);

          await supabase.from("customer_meal_withdrawals").insert({
            credit_id: credit.id,
            customer_id: customerId,
            quantity: debit,
            withdrawn_at: new Date(row.date + "T12:00:00").toISOString(),
            notes: `Retirada em lote - ${format(new Date(row.date), "dd/MM/yyyy")}`,
          });

          const newRemaining = credit.remaining - debit;
          await supabase
            .from("customer_meal_credits")
            .update({ remaining: newRemaining })
            .eq("id", credit.id);

          // Update local reference for next iteration
          credit.remaining = newRemaining;
          remaining -= debit;
        }
      }

      // Send WhatsApp notification with final balance + feedback link
      try {
        const newBalance = totalRemaining - totalToWithdraw;
        await supabase.functions.invoke("send-meal-balance-notification", {
          body: {
            customer_name: customerName,
            customer_phone: customerPhone,
            withdrawn: totalToWithdraw,
            remaining: newBalance,
            notes: `${validRows.length} retirada(s) registrada(s) em lote`,
            feedback_link: feedbackToken ? getFeedbackLink() : null,
          },
        });
      } catch (e) {
        console.warn("Failed to send balance notification:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-credits", customerId] });
      queryClient.invalidateQueries({ queryKey: ["meal-withdrawals", customerId] });
      toast({ title: "Retiradas registradas!" });
      setBatchRows([{ date: new Date().toISOString().split("T")[0], quantity: "" }]);
      setIsBatchWithdrawOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const addBatchRow = () => {
    setBatchRows([...batchRows, { date: new Date().toISOString().split("T")[0], quantity: "" }]);
  };

  const removeBatchRow = (index: number) => {
    if (batchRows.length <= 1) return;
    setBatchRows(batchRows.filter((_, i) => i !== index));
  };

  const updateBatchRow = (index: number, field: keyof BatchRow, value: string) => {
    const updated = [...batchRows];
    updated[index] = { ...updated[index], [field]: value };
    setBatchRows(updated);
  };

  const batchTotal = batchRows.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);

  return (
    <div className="space-y-6">
      {/* ===== FEEDBACK LINK ===== */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star className="h-4 w-4" />
          Link de Avaliação
        </h3>
        {feedbackTokenLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : feedbackToken ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyLink} className="flex-1">
                <Copy className="h-4 w-4 mr-1" /> Copiar Link
              </Button>
              <Button size="sm" variant="outline" onClick={shareFeedbackWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-1" /> Enviar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(getFeedbackLink(), "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Erro ao gerar link</p>
        )}
      </div>

      <Separator />

      {/* ===== SALDO DE MARMITAS ===== */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Saldo de Marmitas
        </h3>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-2 text-center">
              <p className="text-xl font-bold text-primary">{totalRemaining}</p>
              <p className="text-[10px] text-muted-foreground">Restantes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <p className="text-xl font-bold">{totalUsed}</p>
              <p className="text-[10px] text-muted-foreground">Usadas</p>
            </CardContent>
          </Card>
          <Card className={daysToExpiry !== null && daysToExpiry <= 7 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardContent className="p-2 text-center">
              {daysToExpiry !== null ? (
                <>
                  <p className="text-xl font-bold">{daysToExpiry}d</p>
                  <p className="text-[10px] text-muted-foreground">p/ vencer</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold">∞</p>
                  <p className="text-[10px] text-muted-foreground">Sem validade</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {totalPurchased > 0 && (
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalUsed} usadas</span>
              <span>{totalRemaining} restantes</span>
            </div>
            <Progress value={(totalUsed / totalPurchased) * 100} className="h-2" />
          </div>
        )}

        {daysToExpiry !== null && daysToExpiry <= 7 && daysToExpiry >= 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm mb-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{nearestExpiry?.remaining} marmitas vencem em {format(parseISO(nearestExpiry!.expires_at!), "dd/MM", { locale: ptBR })}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Dialog open={isAddCreditOpen} onOpenChange={setIsAddCreditOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Novo Lote de Marmitas</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addCreditMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number" min="1"
                    value={creditForm.quantity}
                    onChange={(e) => setCreditForm({ ...creditForm, quantity: e.target.value })}
                    placeholder="Ex: 30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    value={creditForm.expires_at}
                    onChange={(e) => setCreditForm({ ...creditForm, expires_at: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Vazio = sem validade</p>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input
                    value={creditForm.notes}
                    onChange={(e) => setCreditForm({ ...creditForm, notes: e.target.value })}
                    placeholder="Ex: Pago via Pix"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addCreditMutation.isPending}>
                  {addCreditMutation.isPending ? "Salvando..." : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isBatchWithdrawOpen} onOpenChange={setIsBatchWithdrawOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1" disabled={totalRemaining === 0}>
                <Minus className="w-4 h-4 mr-1" /> Lançar Retiradas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Retiradas em Lote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Saldo disponível</p>
                  <p className="text-3xl font-bold text-primary">{totalRemaining}</p>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_80px_32px] gap-2 text-xs font-medium text-muted-foreground">
                    <span>Data</span>
                    <span>Qtd</span>
                    <span></span>
                  </div>
                  {batchRows.map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_32px] gap-2 items-center">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateBatchRow(i, "date", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => updateBatchRow(i, "quantity", e.target.value)}
                        placeholder="0"
                        className="text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => removeBatchRow(i)}
                        disabled={batchRows.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={addBatchRow}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar linha
                </Button>

                {batchTotal > 0 && (
                  <div className={`p-2 rounded-lg text-sm text-center font-medium ${
                    batchTotal > totalRemaining ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  }`}>
                    Total: {batchTotal} marmita{batchTotal !== 1 ? "s" : ""}
                    {batchTotal > totalRemaining && " (saldo insuficiente!)"}
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={batchWithdrawMutation.isPending || batchTotal === 0 || batchTotal > totalRemaining}
                  onClick={() => batchWithdrawMutation.mutate()}
                >
                  {batchWithdrawMutation.isPending ? "Processando..." : "Confirmar Retiradas"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* ===== HISTÓRICO ===== */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mb-2"
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="w-4 h-4 mr-1" />
          {showHistory ? "Ocultar histórico" : "Ver histórico completo"}
        </Button>

        {showHistory && (
          <div className="space-y-4">
            {/* Withdrawals */}
            {withdrawals.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Retiradas</p>
                <div className="space-y-1">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="flex justify-between p-2 rounded-lg border border-border text-sm">
                      <span className="font-medium">-{w.quantity} marmita{w.quantity > 1 ? "s" : ""}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(w.withdrawn_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credits/Batches */}
            {credits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Lotes</p>
                <div className="space-y-1">
                  {credits.map((c) => {
                    const expired = c.expires_at && isPast(parseISO(c.expires_at));
                    return (
                      <div key={c.id} className={`p-2 rounded-lg border border-border text-sm ${expired ? "opacity-50" : ""}`}>
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {c.quantity} marmitas ({c.remaining} restantes)
                            {expired && <Badge variant="destructive" className="ml-1 text-[10px]">Vencido</Badge>}
                          </span>
                          <span className="text-muted-foreground">
                            {format(new Date(c.created_at), "dd/MM/yy")}
                          </span>
                        </div>
                        {c.expires_at && (
                          <p className="text-xs text-muted-foreground">
                            Vence: {format(parseISO(c.expires_at), "dd/MM/yyyy")}
                          </p>
                        )}
                        {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* ===== FEEDBACKS DO CLIENTE ===== */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star className="h-4 w-4" />
          Avaliações ({feedbacks.length})
        </h3>

        {feedbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma avaliação recebida ainda
          </p>
        ) : (
          <div className="space-y-2">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="border border-border rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= fb.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(fb.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                {fb.liked_items && (
                  <p className="text-xs flex items-start gap-1">
                    <ThumbsUp className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                    {fb.liked_items}
                  </p>
                )}
                {fb.disliked_items && (
                  <p className="text-xs flex items-start gap-1">
                    <ThumbsDown className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                    {fb.disliked_items}
                  </p>
                )}
                {fb.observations && (
                  <p className="text-xs text-muted-foreground">{fb.observations}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailDrawer;
