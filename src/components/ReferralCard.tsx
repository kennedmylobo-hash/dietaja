import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Gift, Copy, Share2, Check } from "lucide-react";

interface ReferralCardProps {
  customerEmail: string;
  customerName?: string;
}

const ReferralCard = ({ customerEmail, customerName }: ReferralCardProps) => {
  const { tenant } = useTenant();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    const fetchReferral = async () => {
      const { data } = await supabase
        .from("referrals")
        .select("code, used_count")
        .eq("referrer_email", customerEmail)
        .eq("active", true)
        .maybeSingle();
      if (data) {
        setReferralCode(data.code);
        setReferralCount(data.used_count);
      }
    };
    fetchReferral();
  }, [customerEmail]);

  const handleCopy = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Código copiado!" });
  };

  const handleShare = () => {
    if (!referralCode) return;
    const msg = `Use meu código ${referralCode} no ${tenant?.name || "DietaJá"} e ganhe desconto!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    const { data: ref } = await supabase
      .from("referrals")
      .select("*")
      .eq("code", redeemCode.trim().toUpperCase())
      .eq("active", true)
      .maybeSingle();
    if (!ref) {
      toast({ title: "Código inválido", variant: "destructive" });
      setRedeeming(false);
      return;
    }
    if (ref.referrer_email === customerEmail) {
      toast({ title: "Você não pode usar seu próprio código", variant: "destructive" });
      setRedeeming(false);
      return;
    }
    if (ref.used_count >= ref.usage_limit) {
      toast({ title: "Este código já atingiu o limite de usos", variant: "destructive" });
      setRedeeming(false);
      return;
    }
    toast({ title: `Código válido! ${ref.discount_percent}% de desconto no próximo pedido.` });
    sessionStorage.setItem("referral_code", ref.code);
    sessionStorage.setItem("referral_discount", String(ref.discount_percent));
    setRedeemCode("");
    setRedeeming(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="w-4 h-4 text-primary" />
          Indique e Ganhe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {referralCode ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Seu código de indicação</Label>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-lg font-mono px-4 py-2">{referralCode}</Badge>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{referralCount} pessoas usaram seu código</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tem um código de indicação?</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={redeemCode}
                  onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="MEUCODIGO"
                  className="uppercase font-mono"
                />
                <Button onClick={handleRedeem} disabled={redeeming}>
                  {redeeming ? "..." : "Usar"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Peça o código de um amigo e ganhe desconto no próximo pedido!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
