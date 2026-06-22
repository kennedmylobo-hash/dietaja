import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/components/CartContext";
import { RefreshCw, X } from "lucide-react";

interface SavedPlan {
  phone: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  savedAt: string;
}

const OrderReminderBanner = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const phone = localStorage.getItem("monte_seu_cardapio_phone");
    if (!phone) return;
    const raw = localStorage.getItem(`meal_plan_${phone}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const daysSinceSave = (Date.now() - new Date(parsed.savedAt).getTime()) / 86400000;
        if (daysSinceSave <= 14) setPlan(parsed);
      } catch {}
    }
  }, []);

  if (!plan || dismissed) return null;

  const handleRepeat = () => {
    plan.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addItem({ ...item, id: item.name, unitPrice: item.price / item.quantity });
      }
    });
    navigate("/cardapio");
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Seu último cardápio está salvo!</p>
            <p className="text-xs text-muted-foreground">
              {plan.items.reduce((s, i) => s + i.quantity, 0)} itens • R$ {plan.total.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleRepeat}>
            Repetir Pedido
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDismissed(true)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderReminderBanner;
