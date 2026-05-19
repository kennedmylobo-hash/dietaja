import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenant } from "@/contexts/TenantContext";
import { useDietPricing } from "@/hooks/useDietPricing";
import { parseDietMessage } from "@/lib/diet-quote-parser";
import { matchSubcategoryName } from "@/lib/subcategory-pricing";
import PricingConfig from "@/components/admin/diet-pricing/PricingConfig";
import FinancialSummary from "@/components/admin/diet-pricing/FinancialSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ClipboardPaste, Trash2, Plus, Send, FileText, Save, History,
  Calculator, ChevronDown, ChevronUp, Copy, Image as ImageIcon, Loader2, X,
} from "lucide-react";
import { buildFormattedQuoteMessage } from "@/lib/quote-message-builder";
import jsPDF from "jspdf";

interface QuoteIngredient {
  name: string;
  weightGrams: number;
  category: "protein" | "carb" | "veggie";
  subcategory: string;
}

interface QuoteItem {
  number: number;
  description: string;
  ingredients: QuoteIngredient[];
  proteinWeight: number;
  carbWeight: number;
  veggieWeight: number;
  totalWeight: number;
  priceOverride: number | null;
}

interface SavedQuote {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: any;
  price_per_gram: number;
  subtotal_per_unit: number | null;
  status: string;
  created_at: string;
}

export default function CustomDietQuoter() {
  const tenantId = useTenantId();
  const { tenant } = useTenant();
  const { settings, setSettings, save: savePricing, saving: savingPricing, getItemPrice, getItemCost } = useDietPricing();

  const [rawText, setRawText] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [saving, setSaving] = useState(false);
  const [extractingImage, setExtractingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("custom_diet_quotes" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20);
    setSavedQuotes((data as any[]) || []);
  };

  const handleParse = () => {
    const parsed = parseDietMessage(rawText);
    if (parsed.length === 0) {
      toast({ title: "Nenhum item encontrado", description: "Cole a lista numerada do WhatsApp.", variant: "destructive" });
      return;
    }
    const subcats = settings.subcategoryPricing;
    setItems(parsed.map(p => ({
      number: p.number, description: p.description,
      ingredients: p.ingredients.map(ing => ({
        name: ing.name,
        weightGrams: ing.weightGrams,
        category: ing.category,
        subcategory: matchSubcategoryName(ing.name, ing.category, subcats) || "Não identificado",
      })),
      proteinWeight: p.proteinWeight, carbWeight: p.carbWeight,
      veggieWeight: p.veggieWeight, totalWeight: p.totalWeight,
      priceOverride: null,
    })));
    toast({ title: `${parsed.length} itens extraídos!` });
  };

  const extractFromImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem (PNG/JPG).", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máx 8MB.", variant: "destructive" });
      return;
    }
    setExtractingImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setImagePreview(base64);
      const { data, error } = await supabase.functions.invoke("extract-diet-from-image", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      const text = (data as any)?.text?.trim();
      if (!text) throw new Error("Não foi possível extrair a dieta da imagem.");
      setRawText(prev => (prev ? prev + "\n" : "") + text);
      toast({ title: "📷 Dieta extraída!", description: "Revise e clique em Extrair Itens." });
    } catch (err: any) {
      toast({ title: "Erro ao ler imagem", description: err.message, variant: "destructive" });
    } finally {
      setExtractingImage(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        extractFromImageFile(file);
      }
    }
  };


  const updateItem = (idx: number, field: keyof QuoteItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Recalculate totalWeight when component weights change
      if (field === "proteinWeight" || field === "carbWeight" || field === "veggieWeight") {
        updated.totalWeight = (updated.proteinWeight || 0) + (updated.carbWeight || 0) + (updated.veggieWeight || 0);
      }
      return updated;
    }));
  };
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const addItem = () => setItems(prev => [...prev, { number: prev.length + 1, description: "", ingredients: [], proteinWeight: 0, carbWeight: 0, veggieWeight: 0, totalWeight: 0, priceOverride: null }]);

  const subtotalPerUnit = items.reduce((sum, item) => sum + getItemPrice(item), 0);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const buildMessage = (quoteNumber: string) => {
    const brandName = tenant?.brand_name || "Restaurante";
    return buildFormattedQuoteMessage({
      brandName,
      quoteNumber,
      customerName,
      items: items.map(item => ({
        number: item.number,
        description: item.description,
        totalWeight: item.totalWeight,
        price: getItemPrice(item),
      })),
      subtotalPerUnit,
      packageOptions: settings.packageOptions,
      notes,
    });
  };

  const handleSave = async (quoteNumber?: string) => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: items as any,
        price_per_gram: settings.pricingMode === "manual" ? settings.manualPricePerGram : null,
        subtotal_per_unit: subtotalPerUnit,
        quote_number: quoteNumber || null,
        package_options: settings.packageOptions.map(p => ({
          days: p.days,
          total: Math.round((subtotalPerUnit * items.length * p.days * (1 - p.discount)) * 100) / 100,
          discount: p.discount,
        })) as any,
        notes: notes || null,
        status: "sent",
      };
      const { error } = await supabase.from("custom_diet_quotes" as any).insert(payload);
      if (error) throw error;
      toast({ title: "Orçamento salvo!" });
      if (showHistory) loadHistory();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyQuote = async () => {
    if (items.length === 0) return;
    try {
      const qn = await generateQuoteNumber();
      const msg = buildMessage(qn);
      await navigator.clipboard.writeText(msg);
      toast({ title: "📋 Orçamento copiado!", description: `Nº ${qn}` });
      handleSave(qn);
    } catch (err: any) {
      toast({ title: "Erro ao copiar", description: err.message, variant: "destructive" });
    }
  };

  const sendWhatsApp = async () => {
    if (items.length === 0) return;
    try {
      const qn = await generateQuoteNumber();
      const msg = buildMessage(qn);
      const phone = customerPhone?.replace(/\D/g, "") || "";
      const url = phone
        ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
      handleSave(qn);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    }
  };

  const generatePDF = () => {
    if (items.length === 0) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = W - 2 * margin;
    const brandName = tenant?.brand_name || "Restaurante";

    // ── Protein palettes + price tables (independent per protein) ─────────────
    type ProteinKey = "FRANGO" | "CARNE" | "PEIXE";
    const PALETTE: Record<ProteinKey, { dark: [number, number, number]; light: [number, number, number]; med: [number, number, number]; label: string }> = {
      FRANGO: { dark: [46, 125, 50],  light: [232, 245, 233], med: [165, 214, 167], label: "FRANGO" },
      CARNE:  { dark: [198, 40, 40],  light: [255, 235, 230], med: [239, 154, 154], label: "CARNE"  },
      PEIXE:  { dark: [21, 101, 192], light: [227, 242, 253], med: [144, 202, 249], label: "PEIXE"  },
    };
    const KIT_PRICES: Record<ProteinKey, { qty: number; unit: number }[]> = {
      FRANGO: [{ qty: 10, unit: 24.90 }, { qty: 20, unit: 22.90 }, { qty: 30, unit: 20.90 }],
      CARNE:  [{ qty: 10, unit: 28.90 }, { qty: 20, unit: 26.90 }, { qty: 30, unit: 23.90 }],
      PEIXE:  [{ qty: 10, unit: 33.90 }, { qty: 20, unit: 31.90 }, { qty: 30, unit: 28.90 }],
    };
    const GREY_TXT: [number, number, number] = [85, 85, 85];

    // Classify each item by protein keyword in description
    const classify = (desc: string): ProteinKey => {
      const d = desc.toLowerCase();
      if (/peixe|til[áa]pia|salm[ãa]o|mer?luza|atum|saint/.test(d)) return "PEIXE";
      if (/frango|peito|coxa|sobrecoxa/.test(d)) return "FRANGO";
      if (/carne|patinho|al[cs]atra|file?[ ]?mignon|file?[ ]?bovino|m[íi]gnon|bovina|moid[ao]|cup[íi]m|m[úu]sculo/.test(d)) return "CARNE";
      return "FRANGO"; // default fallback
    };

    // Group items by protein, preserving the original Opcao numbering across groups
    const groups: { protein: ProteinKey; items: { number: number; description: string }[] }[] = [];
    const order: ProteinKey[] = ["FRANGO", "CARNE", "PEIXE"];
    const byProtein: Record<ProteinKey, { number: number; description: string }[]> = {
      FRANGO: [], CARNE: [], PEIXE: [],
    };
    // Renumber sequentially: 01..N following Frango → Carne → Peixe order
    let opNum = 1;
    const itemsByProtein = items.map(it => ({ protein: classify(it.description), description: it.description.trim() }));
    for (const p of order) {
      for (const it of itemsByProtein.filter(i => i.protein === p)) {
        byProtein[p].push({ number: opNum++, description: it.description });
      }
    }
    for (const p of order) {
      if (byProtein[p].length > 0) groups.push({ protein: p, items: byProtein[p].slice(0, 8) }); // cap at 8
    }

    let y = 14;

    // ── HEADER (dark) ─────────────────────────────────────────────────────────
    doc.setFillColor(33, 33, 33);
    doc.roundedRect(margin, y, contentW, 22, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("ORÇAMENTO — DIETA PERSONALIZADA", W / 2, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`${brandName} • Marmitas personalizadas • Produção sob demanda • Ingredientes frescos`, W / 2, y + 16, { align: "center" });
    y += 26;

    // ── CLIENT ROW ────────────────────────────────────────────────────────────
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold"); doc.setTextColor(0);
    doc.text("Cliente:", margin + 3, y + 6.5);
    doc.setFont("helvetica", "normal"); doc.text(customerName || "—", margin + 17, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.text("Data:", margin + contentW / 2 - 18, y + 6.5);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString("pt-BR"), margin + contentW / 2 - 8, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.text("Validade:", W - margin - 35, y + 6.5);
    doc.setFont("helvetica", "normal");
    doc.text("7 dias", W - margin - 18, y + 6.5);
    y += 14;

    // ── Helper: render one protein section (menu + price table) ───────────────
    const renderSection = (g: typeof groups[number]) => {
      const pal = PALETTE[g.protein];

      // Cardápio header bar
      doc.setFillColor(...pal.dark);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(`CARDÁPIOS — ${pal.label}`, margin + 3, y + 5.5);
      y += 9;

      // Menu rows (full description, wraps to multiple lines, no "…")
      const numW = 24;
      g.items.forEach((it, i) => {
        const desc = it.description;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(desc, contentW - numW - 8);
        const rowH = Math.max(8, 3.2 + lines.length * 4.2);
        // page break if needed (keep 30mm reserved for footer)
        if (y + rowH > H - 32) { doc.addPage(); y = margin; }
        const bg = i % 2 === 0 ? pal.light : [255, 255, 255] as [number, number, number];
        doc.setFillColor(...bg);
        doc.roundedRect(margin, y, contentW, rowH, 1.2, 1.2, "F");
        // badge
        doc.setFillColor(...pal.dark);
        doc.roundedRect(margin + 1.2, y + 1.2, numW - 2.4, rowH - 2.4, 1.2, 1.2, "F");
        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
        doc.text(`Opcao ${String(it.number).padStart(2, "0")}`, margin + numW / 2, y + rowH / 2 + 1, { align: "center" });
        // description (multi-line)
        doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        lines.forEach((ln: string, li: number) => {
          doc.text(ln, margin + numW + 3, y + 5 + li * 4.2);
        });
        y += rowH;
      });

      y += 3;

      // Kit table header
      if (y + 30 > H - 32) { doc.addPage(); y = margin; }
      doc.setFillColor(...pal.dark);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(`KITS E PREÇOS — ${pal.label}`, margin + 3, y + 5.5);
      y += 8;

      // Table column header
      const colW = [contentW * 0.20, contentW * 0.28, contentW * 0.28, contentW * 0.24];
      const colX = [margin];
      for (let i = 0; i < 3; i++) colX.push(colX[i] + colW[i]);
      const centers = colX.map((cx, i) => cx + colW[i] / 2);

      doc.setFillColor(...pal.med);
      doc.rect(margin, y, contentW, 7, "F");
      doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      ["Kit", "Qtd.", "Valor Unitário", "Total"].forEach((h, i) =>
        doc.text(h, centers[i], y + 5, { align: "center" })
      );
      y += 7;

      // Kit rows (independent per-protein prices)
      KIT_PRICES[g.protein].forEach((k, i) => {
        const bg = i % 2 === 0 ? pal.light : [255, 255, 255] as [number, number, number];
        doc.setFillColor(...bg);
        doc.rect(margin, y, contentW, 8.5, "F");
        const total = k.unit * k.qty;
        doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text(`Kit ${k.qty}`, centers[0], y + 5.8, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(`${k.qty} marmitas`, centers[1], y + 5.8, { align: "center" });
        doc.text(`${formatCurrency(k.unit)}/un.`, centers[2], y + 5.8, { align: "center" });
        doc.setFont("helvetica", "bold"); doc.setTextColor(...pal.dark);
        doc.text(formatCurrency(total), centers[3], y + 5.8, { align: "center" });
        y += 8.5;
      });

      y += 6;
    };

    groups.forEach(renderSection);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    if (y + 30 > H - 10) { doc.addPage(); y = margin; }
    const footerY = Math.max(y, H - 28);
    doc.setDrawColor(0); doc.setLineWidth(0.4);
    doc.line(margin, footerY, margin + contentW, footerY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GREY_TXT);
    const tips = [
      "✓ Produzimos após confirmação do pedido",
      "✓ Entregamos em até 3 dias úteis",
      "✓ Taxa de entrega: R$ 10,00",
      "✓ Pagamento cartão: +5%   •   PIX: chave via WhatsApp",
      "❄ Marmitas preparadas, CONGELADAS e enviadas — validade 90 dias no freezer.",
    ];
    tips.forEach((t, i) => doc.text(t, margin, footerY + 4.5 + i * 4));

    doc.save(`orcamento-dieta-${(customerName || "cliente").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`);
    handleSave();
  };

  const loadQuote = (q: SavedQuote) => {
    setCustomerName(q.customer_name || "");
    setCustomerPhone(q.customer_phone || "");
    const loadedItems = (q.items as any[]) || [];
    setItems(loadedItems.map((item: any) => ({
      number: item.number || 0, description: item.description || "",
      ingredients: (item.ingredients || []).map((ing: any) => ({
        name: ing.name || "",
        weightGrams: ing.weightGrams || 0,
        category: ing.category || "protein",
        subcategory: ing.subcategory || "Não identificado",
      })),
      proteinWeight: item.proteinWeight || 0, carbWeight: item.carbWeight || 0,
      veggieWeight: item.veggieWeight || 0, totalWeight: item.totalWeight || 0,
      priceOverride: item.priceOverride ?? null,
    })));
    setShowHistory(false);
    toast({ title: "Orçamento carregado!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dieta Personalizada</h2>
          <p className="text-muted-foreground text-sm">
            Cole a mensagem do WhatsApp e gere o orçamento automaticamente
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
          <History className="w-4 h-4 mr-2" />
          Histórico
          {showHistory ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      {/* Pricing Config */}
      <PricingConfig
        settings={settings}
        onChange={setSettings}
        onSave={savePricing}
        saving={savingPricing}
      />

      {/* History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamentos Anteriores</CardTitle>
          </CardHeader>
          <CardContent>
            {savedQuotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum orçamento salvo ainda.</p>
            ) : (
              <div className="space-y-2">
                {savedQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => loadQuote(q)}
                  >
                    <div>
                      <p className="font-medium text-sm">{q.customer_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("pt-BR")} •{" "}
                        {((q.items as any[]) || []).length} itens •{" "}
                        {q.subtotal_per_unit ? formatCurrency(q.subtotal_per_unit) : "—"}/refeição
                      </p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Carregar</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4" />
            Cole a lista ou print do WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Cole o texto OU um print (Ctrl+V) da dieta. Ex:\n1- 3x Filé de Peixe (100g) com Arroz (150g) e Legumes (50g)\n2- 4x Frango Fit (100g) com Batata Doce (150g) e Mix (50g)`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onPaste={handlePaste}
            rows={6}
            disabled={extractingImage}
          />

          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Print da dieta" className="max-h-40 rounded-lg border" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:opacity-90"
                aria-label="Remover imagem"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={extractingImage}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) extractFromImageFile(f);
                  e.target.value = "";
                }}
              />
              <div className={`w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${extractingImage ? "opacity-50 pointer-events-none" : ""}`}>
                {extractingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <span className="text-sm">{extractingImage ? "Lendo print..." : "📷 Enviar print da dieta"}</span>
              </div>
            </label>
            <Button onClick={handleParse} className="flex-1" variant="cta" disabled={extractingImage}>
              <Calculator className="w-4 h-4 mr-2" />
              Extrair Itens
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Dica: você pode colar uma imagem direto no campo de texto (Ctrl+V) — igual no Claude.
          </p>
        </CardContent>
      </Card>


      {items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do cliente</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Maria Silva" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(77) 99999-9999" />
            </div>
          </div>

          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-16">Total</TableHead>
                    <TableHead className="w-32 text-right">Preço un.</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const hasUnmatched = item.ingredients.some(ing => ing.subcategory === "Não identificado");
                    return (
                      <>
                        <TableRow key={`item-${idx}`} className={hasUnmatched ? "border-l-2 border-l-amber-500" : ""}>
                          <TableCell className="font-medium">{item.number}</TableCell>
                          <TableCell>
                            <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="text-sm" />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-medium">{item.totalWeight}g</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={formatCurrency(getItemPrice({ ...item, priceOverride: null }))}
                                value={item.priceOverride ?? ""}
                                onChange={(e) => updateItem(idx, "priceOverride", e.target.value ? parseFloat(e.target.value) : null)}
                                className={`text-sm w-24 text-right ${item.priceOverride !== null ? "border-primary ring-1 ring-primary/30" : ""}`}
                              />
                              {item.priceOverride !== null && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => updateItem(idx, "priceOverride", null)}
                                  title="Voltar ao preço automático"
                                >
                                  <span className="text-xs">↺</span>
                                </Button>
                              )}
                            </div>
                            {item.priceOverride !== null && (
                              <p className="text-[10px] text-primary mt-0.5">Manual</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* Ingredient rows */}
                        {item.ingredients.length > 0 && (
                          <TableRow key={`ings-${idx}`} className="bg-muted/30 hover:bg-muted/40">
                            <TableCell />
                            <TableCell colSpan={4}>
                              <div className="space-y-1.5 py-1">
                                {item.ingredients.map((ing, ingIdx) => {
                                  const categoryEmoji = ing.category === "protein" ? "🥩" : ing.category === "carb" ? "🍚" : "🥦";
                                  const isUnmatched = ing.subcategory === "Não identificado";
                                  return (
                                    <div key={ingIdx} className="flex items-center gap-2 text-xs">
                                      <span>{categoryEmoji}</span>
                                      <span className="text-muted-foreground min-w-[100px]">{ing.name}</span>
                                      <span className="font-medium">{ing.weightGrams}g</span>
                                      <span className="mx-1">→</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        isUnmatched
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-300"
                                          : "bg-primary/10 text-primary"
                                      }`}>
                                        {ing.subcategory}
                                      </span>
                                      {isUnmatched && (
                                        <span className="text-amber-600 text-[10px]">⚠ Preencher</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addItem} className="mt-3">
                <Plus className="w-4 h-4 mr-1" /> Adicionar item
              </Button>
            </CardContent>
          </Card>

          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações sobre o orçamento..." rows={2} />
          </div>

          {/* Financial Summary */}
          <FinancialSummary
            items={items}
            settings={settings}
            getItemPrice={getItemPrice}
            getItemCost={getItemCost}
            formatCurrency={formatCurrency}
          />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleCopyQuote} variant="cta" className="flex-1">
              <Copy className="w-4 h-4 mr-2" /> Copiar Orçamento
            </Button>
            <Button onClick={sendWhatsApp} variant="outline" className="flex-1">
              <Send className="w-4 h-4 mr-2" /> Enviar pelo WhatsApp
            </Button>
            <Button onClick={generatePDF} variant="outline" className="flex-1">
              <FileText className="w-4 h-4 mr-2" /> Gerar PDF
            </Button>
            <Button onClick={() => handleSave()} variant="secondary" disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
