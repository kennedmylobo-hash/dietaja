import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Copy, Send, History, ChevronDown, ChevronUp, Loader2, Trash2, FileText, Image as ImageIcon, X, Download } from "lucide-react";
import jsPDF from "jspdf";

interface SavedQuote {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  raw_diet_input: string | null;
  formatted_message: string | null;
  quote_number: string | null;
  notes: string | null;
  created_at: string;
}

export default function AIDietQuoter() {
  const tenantId = useTenantId();
  const { tenant } = useTenant();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dietText, setDietText] = useState("");
  const [priceChicken, setPriceChicken] = useState("22.90");
  const [priceBeef, setPriceBeef] = useState("25.90");
  const [priceFish, setPriceFish] = useState("28.90");
  const [priceVeggie, setPriceVeggie] = useState("21.90");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);

  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("custom_diet_quotes" as any)
      .select("id, customer_name, customer_phone, raw_diet_input, formatted_message, quote_number, notes, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    setSavedQuotes((data as any[]) || []);
  };

  const generateQuoteNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("custom_diet_quotes" as any)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", `${year}-01-01`)
      .lte("created_at", `${year}-12-31`);
    const seq = ((count as number) || 0) + 1;
    return `ORC-${year}-${String(seq).padStart(4, "0")}`;
  };

  const handleGenerate = async () => {
    if (!customerName.trim() || !dietText.trim()) {
      toast({ title: "Preencha nome do cliente e a dieta", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setMessage("");
    try {
      const qn = await generateQuoteNumber();
      const pricingHints = [
        `Marmita com FRANGO (peito, coxa, file de frango, almôndegas de frango, estrogonofe de frango): R$ ${priceChicken}/un`,
        `Marmita com CARNE BOVINA (filé, patinho, carne moída, almôndegas de carne, alcatra): R$ ${priceBeef}/un`,
        `Marmita com PEIXE (tilápia, filé de peixe, salmão): R$ ${priceFish}/un`,
        `Marmita VEGETARIANA / sem proteína animal: R$ ${priceVeggie}/un`,
      ].join("\n");
      const { data, error } = await supabase.functions.invoke("generate-diet-quote", {
        body: {
          customerName,
          dietText,
          brandName: tenant?.brand_name || "Marmitaria",
          quoteNumber: qn,
          pricing: pricingHints,
          notes,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const msg = (data as any)?.message || "";
      setMessage(msg);

      // Save to history
      await supabase.from("custom_diet_quotes" as any).insert({
        tenant_id: tenantId,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        items: [] as any,
        raw_diet_input: dietText,
        formatted_message: msg,
        quote_number: qn,
        notes: notes || null,
        status: "generated",
      });
      toast({ title: "Orçamento gerado!", description: `Nº ${qn}` });
      if (showHistory) loadHistory();
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    toast({ title: "📋 Copiado!" });
  };

  const handleSendWhatsApp = () => {
    if (!message) return;
    const phone = customerPhone.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const loadQuote = (q: SavedQuote) => {
    setCustomerName(q.customer_name || "");
    setCustomerPhone(q.customer_phone || "");
    setDietText(q.raw_diet_input || "");
    setNotes(q.notes || "");
    setMessage(q.formatted_message || "");
    setShowHistory(false);
    toast({ title: "Orçamento carregado!" });
  };

  const deleteQuote = async (id: string) => {
    if (!confirm("Excluir este orçamento?")) return;
    await supabase.from("custom_diet_quotes" as any).delete().eq("id", id);
    loadHistory();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Gerador de Orçamento por IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Cole a dieta enviada pela nutricionista — a IA gera o orçamento formatado para WhatsApp
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
          <History className="w-4 h-4 mr-2" /> Histórico
          {showHistory ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      {showHistory && (
        <Card>
          <CardHeader><CardTitle className="text-base">Orçamentos salvos</CardTitle></CardHeader>
          <CardContent>
            {savedQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum orçamento ainda.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedQuotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <button className="flex-1 text-left" onClick={() => loadQuote(q)}>
                      <p className="font-medium text-sm">
                        {q.customer_name || "Sem nome"}
                        {q.quote_number && <span className="text-xs text-muted-foreground ml-2">{q.quote_number}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleString("pt-BR")}
                      </p>
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => deleteQuote(q.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome do cliente *</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="João Lima" />
        </div>
        <div>
          <Label>WhatsApp (opcional)</Label>
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(77) 99999-9999" />
        </div>
      </div>

      <div>
        <Label>Dieta enviada pela nutricionista *</Label>
        <Textarea
          value={dietText}
          onChange={(e) => setDietText(e.target.value)}
          rows={10}
          placeholder={`Cole a dieta completa aqui. Ex:\n\nALMOÇO 12:00 – 13:00\n★ FRANGO GRELHADO OU ASSADO – PEITO DE FRANGO OU COXA: 200g\nSubstitutos: tilápia 240g, filé/patinho 200g\n★ LEGUMES REFOGADOS 200g (tomate, cenoura, chuchu...)\n★ 70g ARROZ BRANCO (subst: 50g arroz + 50g feijão / 100g batata inglesa)\n+ SALADA DE FOLHAS`}
        />
      </div>

      <div>
        <Label>💰 Preço unitário por tipo de proteína (a IA aplica o valor certo em cada marmita)</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <div>
            <Label className="text-xs flex items-center gap-1">🍗 Frango</Label>
            <Input type="number" step="0.10" value={priceChicken} onChange={(e) => setPriceChicken(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">🥩 Carne</Label>
            <Input type="number" step="0.10" value={priceBeef} onChange={(e) => setPriceBeef(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">🐟 Peixe</Label>
            <Input type="number" step="0.10" value={priceFish} onChange={(e) => setPriceFish(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">🥗 Veggie</Label>
            <Input type="number" step="0.10" value={priceVeggie} onChange={(e) => setPriceVeggie(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Cada marmita é precificada individualmente pela proteína dela — o total do orçamento é soma item a item.
        </p>
      </div>

      <div>
        <Label>Observações para a IA (opcional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Ex: sem salada de folhas (cliente vai congelar), desconto extra de 5%..." />
      </div>

      <Button onClick={handleGenerate} disabled={generating} variant="cta" className="w-full">
        {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Orçamento</>}
      </Button>

      {message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Orçamento gerado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={20} className="font-mono text-xs" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleCopy} variant="cta" className="flex-1">
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button onClick={handleSendWhatsApp} variant="outline" className="flex-1">
                <Send className="w-4 h-4 mr-2" /> Enviar WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
