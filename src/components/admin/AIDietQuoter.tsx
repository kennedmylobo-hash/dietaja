import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Copy, Send, History, ChevronDown, ChevronUp, Loader2, Trash2, FileText, Image as ImageIcon, X, Download, Eye } from "lucide-react";
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
  const [dietImage, setDietImage] = useState<string | null>(null); // base64 data URL
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Envie uma imagem", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem grande demais (máx 5MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setDietImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

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
    if (!customerName.trim() || (!dietText.trim() && !dietImage)) {
      toast({ title: "Informe nome do cliente e a dieta (texto ou print)", variant: "destructive" });
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
          dietImageBase64: dietImage || undefined,
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

      await supabase.from("custom_diet_quotes" as any).insert({
        tenant_id: tenantId,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        items: [] as any,
        raw_diet_input: dietText || "[imagem enviada pelo cliente]",
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

  // === Professional PDF builder (1 page, colored sections per protein) ===
  const PROTEIN_COLORS: Record<string, [number, number, number]> = {
    FRANGO: [46, 125, 50],   // green
    CARNE: [230, 81, 0],     // orange
    PEIXE: [21, 101, 192],   // blue
    VEGGIE: [106, 27, 154],  // purple
  };
  const PROTEIN_EMOJI: Record<string, string> = {
    FRANGO: "[F]", CARNE: "[C]", PEIXE: "[P]", VEGGIE: "[V]",
  };

  type Block = { protein: keyof typeof PROTEIN_COLORS; options: string[]; prices: string[] };

  const parseMessageIntoBlocks = (raw: string): Block[] => {
    const cleaned = raw.replace(/\*(.+?)\*/g, "$1"); // strip *bold*
    const sections = cleaned.split(/━+/g).map(s => s.trim()).filter(Boolean);
    const blocks: Block[] = [];
    for (const sec of sections) {
      const protein = (["FRANGO", "CARNE", "PEIXE", "VEGGIE"] as const).find(p => sec.toUpperCase().includes(p));
      if (!protein) continue;
      const lines = sec.split("\n").map(l => l.trim()).filter(Boolean);
      const options: string[] = [];
      const prices: string[] = [];
      let mode: "opt" | "price" | null = null;
      for (const ln of lines) {
        if (/Composi[çc][aã]o/i.test(ln)) { mode = "opt"; continue; }
        if (/Tabela de pre/i.test(ln)) { mode = "price"; continue; }
        if (/^[•\-]/.test(ln)) {
          const txt = ln.replace(/^[•\-]\s*/, "");
          if (mode === "opt") options.push(txt);
          else if (mode === "price") prices.push(txt);
        }
      }
      blocks.push({ protein, options: options.slice(0, 5), prices: prices.slice(0, 3) });
    }
    return blocks;
  };

  const buildProfessionalPDF = (): jsPDF => {
    const brand = tenant?.brand_name || "Marmitaria";
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Header bar
    doc.setFillColor(33, 33, 33);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(brand.toUpperCase(), margin, 11);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("ORÇAMENTO — DIETA PERSONALIZADA", margin, 17);
    doc.setFontSize(8);
    const today = new Date().toLocaleDateString("pt-BR");
    doc.text(`Validade: 7 dias  •  ${today}`, pageW - margin, 17, { align: "right" });

    // Client info row
    doc.setTextColor(33);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", margin, 30);
    doc.setFont("helvetica", "normal");
    doc.text(customerName || "—", margin + 14, 30);
    if (customerPhone) {
      doc.setFont("helvetica", "bold");
      doc.text("WhatsApp:", pageW / 2, 30);
      doc.setFont("helvetica", "normal");
      doc.text(customerPhone, pageW / 2 + 18, 30);
    }

    // Parse blocks
    const blocks = parseMessageIntoBlocks(message);
    const blockCount = blocks.length || 1;
    const blockW = (pageW - margin * 2 - (blockCount - 1) * 4) / blockCount;
    const blockY = 36;
    const blockH = pageH - blockY - 30; // leave room for footer

    blocks.forEach((b, i) => {
      const x = margin + i * (blockW + 4);
      const [r, g, bl] = PROTEIN_COLORS[b.protein];

      // colored header
      doc.setFillColor(r, g, bl);
      doc.rect(x, blockY, blockW, 9, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${PROTEIN_EMOJI[b.protein]} ${b.protein}`, x + 3, blockY + 6);

      // body background
      doc.setFillColor(250, 250, 250);
      doc.rect(x, blockY + 9, blockW, blockH - 9, "F");
      doc.setDrawColor(r, g, bl);
      doc.setLineWidth(0.3);
      doc.rect(x, blockY + 9, blockW, blockH - 9, "S");

      // Options
      doc.setTextColor(33);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("OPÇÕES DE COMPOSIÇÃO", x + 3, blockY + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      let yy = blockY + 18;
      b.options.forEach((opt, oi) => {
        const label = `${String(oi + 1).padStart(2, "0")}. ${opt}`;
        const wrapped = doc.splitTextToSize(label, blockW - 6);
        wrapped.forEach((ln: string) => {
          doc.text(ln, x + 3, yy);
          yy += 3.4;
        });
        yy += 0.8;
      });

      // Prices table
      const priceY = blockY + blockH - 30;
      doc.setFillColor(r, g, bl);
      doc.rect(x, priceY, blockW, 6, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TABELA DE PREÇOS", x + 3, priceY + 4.2);

      doc.setTextColor(33);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let py = priceY + 10;
      b.prices.forEach((p) => {
        const wrapped = doc.splitTextToSize(p, blockW - 6);
        wrapped.forEach((ln: string) => {
          doc.text(ln, x + 3, py);
          py += 3.8;
        });
        py += 0.5;
      });
    });

    // Footer
    const footerY = pageH - 24;
    doc.setDrawColor(200);
    doc.line(margin, footerY, pageW - margin, footerY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(33);
    doc.text("INFORMAÇÕES", margin, footerY + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("• Marmitas preparadas, CONGELADAS e enviadas (validade 90 dias no freezer)", margin, footerY + 8);
    doc.text("• Produção sob demanda — entrega em até 3 dias úteis após confirmação", margin, footerY + 11.5);
    doc.text("• Pagamento: PIX  |  Cartão (+5% acréscimo)  •  Taxa de entrega: R$ 10,00", margin, footerY + 15);
    doc.text("• Você pode combinar proteínas (ex.: 10 frango + 10 carne + 10 peixe)", margin, footerY + 18.5);
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text(`Gerado por ${brand}  •  ${today}`, pageW - margin, footerY + 22, { align: "right" });

    return doc;
  };

  const handlePreviewPDF = () => {
    if (!message) return;
    try {
      const doc = buildProfessionalPDF();
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(url);
    } catch (err: any) {
      toast({ title: "Erro no preview", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadPDF = () => {
    if (!message) return;
    const doc = buildProfessionalPDF();
    const fname = `orcamento-${(customerName || "cliente").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fname);
    toast({ title: "📄 PDF baixado!" });
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
          rows={8}
          placeholder={`Cole a dieta completa aqui OU envie o print abaixo. Ex:\n\nALMOÇO 12:00 – 13:00\n★ FRANGO GRELHADO – PEITO DE FRANGO: 200g\n★ LEGUMES REFOGADOS 200g\n★ 70g ARROZ BRANCO`}
        />
        <div className="mt-2 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-dashed cursor-pointer hover:bg-muted text-sm">
            <ImageIcon className="w-4 h-4" />
            {dietImage ? "Trocar print" : "📷 Enviar print da dieta"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </label>
          {dietImage && (
            <div className="relative">
              <img src={dietImage} alt="Dieta" className="h-16 w-16 object-cover rounded border" />
              <button
                type="button"
                onClick={() => setDietImage(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <span className="text-xs text-muted-foreground">A IA lê a imagem e extrai os itens automaticamente.</span>
        </div>
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

      {/* Quick checklist — what the AI will quote */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">✅ Confira antes de gerar — o que a IA vai cotar:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {([["🍗 Frango", priceChicken, "FRANGO"], ["🥩 Carne", priceBeef, "CARNE"], ["🐟 Peixe", priceFish, "PEIXE"]] as const).map(([label, p]) => {
              const unit = parseFloat(p || "0");
              const p10 = unit;
              const p20 = unit * 0.95;
              const p30 = unit * 0.90;
              return (
                <div key={label} className="rounded-lg border p-2 bg-muted/30">
                  <div className="font-semibold mb-1">{label}</div>
                  <div>10un → R$ {p10.toFixed(2)}/un = <b>R$ {(p10 * 10).toFixed(2)}</b></div>
                  <div>20un (5% off) → R$ {p20.toFixed(2)}/un = <b>R$ {(p20 * 20).toFixed(2)}</b></div>
                  <div>30un (10% off) → R$ {p30.toFixed(2)}/un = <b>R$ {(p30 * 30).toFixed(2)}</b></div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            💡 Mude os preços acima se algum valor estiver fora do esperado antes de gerar.
          </p>
        </CardContent>
      </Card>

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
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <Button onClick={handleCopy} variant="cta" className="flex-1 min-w-[140px]">
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button onClick={handleSendWhatsApp} variant="outline" className="flex-1 min-w-[140px]">
                <Send className="w-4 h-4 mr-2" /> Enviar WhatsApp
              </Button>
              <Button onClick={handlePreviewPDF} variant="outline" className="flex-1 min-w-[140px]">
                <Eye className="w-4 h-4 mr-2" /> Pré-visualizar PDF
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 min-w-[140px]">
                <Download className="w-4 h-4 mr-2" /> Baixar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Preview Modal */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => { if (!open) { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); } }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>📄 Pré-visualização do PDF</span>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" /> Baixar
              </Button>
            </DialogTitle>
          </DialogHeader>
          {pdfPreviewUrl && (
            <iframe src={pdfPreviewUrl} className="flex-1 w-full" title="Pré-visualização do orçamento" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
