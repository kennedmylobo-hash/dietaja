import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenantId } from "@/hooks/useTenantId";

interface StoredFlavor {
  name: string;
  protein: string;
  carb: string;
  mix: string;
  quantity: number;
}

interface StoredMealPlan {
  flavors: StoredFlavor[];
  selectedQuantity: number;
  selectedLine: string;
  lineConfig: { label: string; weight: number };
  unitPrice: number;
  totalPrice: number;
  savedAt: string;
}

export default function MealPlanCard() {
  const [plan, setPlan] = useState<StoredMealPlan | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const navigate = useNavigate();
  const tenantId = useTenantId();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tenant_customer");
      if (stored) {
        const { phone } = JSON.parse(stored);
        if (phone) {
          const digits = phone.replace(/\D/g, "");
          setCustomerPhone(digits);
          const planData = localStorage.getItem(`meal_plan_${digits}`);
          if (planData) {
            setPlan(JSON.parse(planData));
            return;
          }
        }
      }
      const last = localStorage.getItem("meal_plan_last");
      if (last) setPlan(JSON.parse(last));
    } catch {}
  }, []);

  const handleClear = () => {
    setPlan(null);
    if (customerPhone) {
      localStorage.removeItem(`meal_plan_${customerPhone}`);
    }
    localStorage.removeItem("meal_plan_last");
  };

  if (!plan) return null;

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-green-600" />
          Meu Plano Alimentar
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear} title="Remover plano">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {plan.selectedQuantity} marmitas {plan.lineConfig.label} ({plan.lineConfig.weight}g)
          </span>
          <span className="font-semibold">
            R$ {plan.totalPrice.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <div className="divide-y divide-green-100">
          {plan.flavors.map((f, i) => (
            <div key={i} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{f.name}</span>
                <span className="text-xs text-muted-foreground bg-green-100 px-2 py-0.5 rounded-full">{f.quantity}x</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                <span>🥩 {f.protein}</span>
                <span>🍚 {f.carb}</span>
                <span>🥗 {f.mix}</span>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-green-700 border-green-300 hover:bg-green-100"
          onClick={() => navigate("/monte-seu-cardapio")}
        >
          <UtensilsCrossed className="h-4 w-4 mr-2" />
          Gerar novo plano
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Salvo em {new Date(plan.savedAt).toLocaleDateString("pt-BR")}
        </p>
      </CardContent>
    </Card>
  );
}
