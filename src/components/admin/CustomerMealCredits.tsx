import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Minus, Package, AlertTriangle, Clock, History } from "lucide-react";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerMealCreditsProps {
  customerId: string;
  customerName: string;
  customerPhone: string;
}

interface MealCredit {
  id: string;
  customer_id: string;
  quantity: number;
  remaining: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface MealWithdrawal {
  id: string;
  credit_id: string;
  customer_id: string;
  quantity: number;
  withdrawn_at: string;
  notes: string | null;
}

const CustomerMealCredits = ({ customerId, customerName, customerPhone }: CustomerMealCreditsProps) => {
  const queryClient = useQueryClient();
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creditForm, setCreditForm] = useState({ quantity: "", expires_at: "", notes: "" });
  const [withdrawForm, setWithdrawForm] = useState({ quantity: "", notes: "" });

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

  // Fetch feedback token for this customer
  const { data: feedbackToken } = useQuery({
    queryKey: ["feedback-token", customerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feedback_tokens")
        .select("token")
        .eq("recurring_customer_id", customerId)
        .eq("is_active", true)
        .maybeSingle();
      return data?.token || null;
    },
  });

  const getFeedbackLink = () => {
    if (!feedbackToken) return null;
    return `${window.location.origin}/feedback/${feedbackToken}`;
  };

  // Active credits (remaining > 0 and not expired)
  const activeCredits = credits.filter(c => {
    if (c.remaining <= 0) return false;
    if (c.expires_at && isPast(parseISO(c.expires_at))) return false;
    return true;
  });

  const totalRemaining = activeCredits.reduce((sum, c) => sum + c.remaining, 0);
  const totalPurchased = credits.reduce((sum, c) => sum + c.quantity, 0);
  const totalUsed = totalPurchased - credits.reduce((sum, c) => sum + c.remaining, 0);

  // Nearest expiration
  const nearestExpiry = activeCredits
    .filter(c => c.expires_at)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())[0];

  const daysToExpiry = nearestExpiry?.expires_at
    ? differenceInDays(parseISO(nearestExpiry.expires_at), new Date())
    : null;

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

      // Send WhatsApp notification
      try {
        const newBalance = totalRemaining + qty;
        await supabase.functions.invoke("send-meal-balance-notification", {
          body: {
            customer_name: customerName,
            customer_phone: customerPhone,
            added: qty,
            remaining: newBalance,
            notes: creditForm.notes || null,
            feedback_link: getFeedbackLink(),
          },
        });
      } catch (e) {
        console.warn("Failed to send WhatsApp balance notification:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-credits", customerId] });
      toast({ title: "Crédito adicionado!" });
      setCreditForm({ quantity: "", expires_at: "", notes: "" });
      setIsAddCreditOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const qty = parseInt(withdrawForm.quantity);
      if (!qty || qty <= 0) throw new Error("Quantidade inválida");
      if (qty > totalRemaining) throw new Error(`Saldo insuficiente. Disponível: ${totalRemaining}`);

      // Debit from oldest credit first (FIFO)
      let remaining = qty;
      const sorted = [...activeCredits].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const credit of sorted) {
        if (remaining <= 0) break;
        const debit = Math.min(remaining, credit.remaining);

        // Insert withdrawal
        const { error: wErr } = await supabase.from("customer_meal_withdrawals").insert({
          credit_id: credit.id,
          customer_id: customerId,
          quantity: debit,
          notes: withdrawForm.notes || null,
        });
        if (wErr) throw wErr;

        // Update credit remaining
        const { error: uErr } = await supabase
          .from("customer_meal_credits")
          .update({ remaining: credit.remaining - debit })
          .eq("id", credit.id);
        if (uErr) throw uErr;

        remaining -= debit;
      }

      // Send WhatsApp notification
      try {
        const newBalance = totalRemaining - qty;
        await supabase.functions.invoke("send-meal-balance-notification", {
          body: {
            customer_name: customerName,
            customer_phone: customerPhone,
            withdrawn: qty,
            remaining: newBalance,
            notes: withdrawForm.notes || null,
            feedback_link: getFeedbackLink(),
          },
        });
      } catch (e) {
        console.warn("Failed to send WhatsApp balance notification:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-credits", customerId] });
      queryClient.invalidateQueries({ queryKey: ["meal-withdrawals", customerId] });
      toast({ title: "Retirada registrada!" });
      setWithdrawForm({ quantity: "", notes: "" });
      setIsWithdrawOpen(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{totalRemaining}</p>
            <p className="text-xs text-muted-foreground">Restantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{totalUsed}</p>
            <p className="text-xs text-muted-foreground">Retiradas</p>
          </CardContent>
        </Card>
        <Card className={daysToExpiry !== null && daysToExpiry <= 7 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="p-3 text-center">
            {daysToExpiry !== null ? (
              <>
                <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{daysToExpiry}d</p>
                <p className="text-xs text-muted-foreground">p/ vencer</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">∞</p>
                <p className="text-xs text-muted-foreground">Sem validade</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {totalPurchased > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalUsed} usadas</span>
            <span>{totalRemaining} restantes</span>
          </div>
          <Progress value={(totalUsed / totalPurchased) * 100} className="h-2" />
        </div>
      )}

      {/* Expiry warning */}
      {daysToExpiry !== null && daysToExpiry <= 7 && daysToExpiry >= 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {nearestExpiry?.remaining} marmitas vencem em{" "}
            {format(parseISO(nearestExpiry!.expires_at!), "dd/MM", { locale: ptBR })}
          </span>
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
                  type="number"
                  min="1"
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
                <p className="text-xs text-muted-foreground">Deixe vazio se não expira</p>
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

        <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="flex-1" disabled={totalRemaining === 0}>
              <Minus className="w-4 h-4 mr-1" /> Registrar Retirada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar Retirada</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); withdrawMutation.mutate(); }} className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-sm text-muted-foreground">Saldo disponível</p>
                <p className="text-3xl font-bold text-primary">{totalRemaining}</p>
              </div>
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  max={totalRemaining}
                  value={withdrawForm.quantity}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, quantity: e.target.value })}
                  placeholder="Ex: 8"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Input
                  value={withdrawForm.notes}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                  placeholder="Ex: Retirada presencial"
                />
              </div>
              <Button type="submit" className="w-full" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? "Processando..." : "Confirmar Retirada"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* History toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => setShowHistory(!showHistory)}
      >
        <History className="w-4 h-4 mr-1" />
        {showHistory ? "Ocultar histórico" : "Ver histórico"}
      </Button>

      {/* History */}
      {showHistory && (
        <div className="space-y-3">
          {/* Credits */}
          <div>
            <p className="text-sm font-medium mb-2">Lotes</p>
            <div className="space-y-2">
              {credits.map((c) => {
                const expired = c.expires_at && isPast(parseISO(c.expires_at));
                return (
                  <div key={c.id} className={`p-2 rounded-lg border text-sm ${expired ? "opacity-50" : ""}`}>
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {c.quantity} marmitas
                        {expired && <Badge variant="destructive" className="ml-2 text-xs">Vencido</Badge>}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yy")}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Restantes: {c.remaining}</span>
                      {c.expires_at && (
                        <span>Vence: {format(parseISO(c.expires_at), "dd/MM/yy")}</span>
                      )}
                    </div>
                    {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Withdrawals */}
          {withdrawals.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Retiradas</p>
              <div className="space-y-1">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex justify-between p-2 rounded-lg border text-sm">
                    <span>-{w.quantity} marmitas</span>
                    <span className="text-muted-foreground">
                      {format(new Date(w.withdrawn_at), "dd/MM/yy HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerMealCredits;
