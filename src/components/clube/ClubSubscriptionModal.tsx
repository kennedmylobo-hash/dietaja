import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClubPlan } from "@/hooks/useClubPlans";
import { useNavigate } from "react-router-dom";
import { formatCPF, validateCPF } from "@/lib/cpf";
import { useTenantId } from "@/hooks/useTenantId";

const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

interface ClubSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ClubPlan | null;
}

const ClubSubscriptionModal = ({ open, onOpenChange, plan }: ClubSubscriptionModalProps) => {
  const navigate = useNavigate();
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    deliveryOption: "delivery" as "delivery" | "pickup",
    address: "",
  });

  const handleChange = (field: string, value: string) => {
    if (field === "cpf") value = formatCPF(value);
    if (field === "phone") value = formatPhoneInput(value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!plan) return;

    // Validations
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.cpf.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const cleanCpf = form.cpf.replace(/\D/g, "");
    if (!validateCPF(cleanCpf)) {
      toast({ title: "CPF inválido", variant: "destructive" });
      return;
    }

    if (form.deliveryOption === "delivery" && !form.address.trim()) {
      toast({ title: "Informe o endereço de entrega", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-club-subscription", {
        body: {
          plan_id: plan.id,
          kit_type: plan.kit_type,
          kit_name: plan.name,
          price: plan.price,
          customer: {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            cpf: cleanCpf,
          },
          delivery: {
            option: form.deliveryOption,
            address: form.deliveryOption === "delivery" ? form.address.trim() : null,
          },
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      if (data?.paymentId) {
        onOpenChange(false);
        navigate(`/pix/${data.paymentId}`);
      } else {
        throw new Error("Não foi possível gerar o pagamento");
      }
    } catch (err: any) {
      console.error("Subscription error:", err);
      toast({
        title: "Erro ao criar assinatura",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-600" />
            Assinar {plan.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {plan.items_description} — R$ {plan.price.toFixed(2).replace(".", ",")}/mês
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="club-name">Nome completo *</Label>
            <Input
              id="club-name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="club-email">E-mail *</Label>
            <Input
              id="club-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="club-phone">WhatsApp *</Label>
            <Input
              id="club-phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(77) 99999-9999"
              maxLength={15}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="club-cpf">CPF *</Label>
            <Input
              id="club-cpf"
              value={form.cpf}
              onChange={(e) => handleChange("cpf", e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <div className="space-y-2">
            <Label>Recebimento</Label>
            <RadioGroup
              value={form.deliveryOption}
              onValueChange={(v) => handleChange("deliveryOption", v)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="club-delivery" />
                <Label htmlFor="club-delivery" className="cursor-pointer">Entrega</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="club-pickup" />
                <Label htmlFor="club-pickup" className="cursor-pointer">Retirada</Label>
              </div>
            </RadioGroup>
          </div>

          {form.deliveryOption === "delivery" && (
            <div className="space-y-2">
              <Label htmlFor="club-address">Endereço de entrega *</Label>
              <Input
                id="club-address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Rua, número, bairro"
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              `Assinar por R$ ${plan.price.toFixed(2).replace(".", ",")}/mês`
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao assinar, você concorda com a cobrança mensal automática via PIX.
            Cancele quando quiser.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClubSubscriptionModal;
