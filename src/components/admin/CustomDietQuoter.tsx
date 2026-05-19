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
  // Override manual do preço do Kit 10 por proteína (R$/un). Kits 20/30 derivam (-5% / -10%). null = automático.
  const [kitOverrides, setKitOverrides] = useState<{ FRANGO: number | null; CARNE: number | null; PEIXE: number | null }>({ FRANGO: null, CARNE: null, PEIXE: null });

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
    // Tabela de regras (preço Kit 10 por proteína e peso). Kits 20 = -5%, 30 = -10%.
    const RULES: Record<ProteinKey, { w100: number; w200: number }> = {
      FRANGO: { w100: 24.90, w200: 29.90 },
      CARNE:  { w100: 27.90, w200: 34.90 },
      PEIXE:  { w100: 33.90, w200: 39.90 }, // Peixe = Frango + 9 (mantido como tier alto)
    };
    // Calcula preço-base do Kit 10 conforme peso médio da proteína no grupo.
    // 100g → w100; 200g → w200; intermediário → interpolação linear; <100 ou >200 → extrapolado.
    const basePriceFor = (protein: ProteinKey, avgProteinG: number): number => {
      const r = RULES[protein];
      const w = Math.max(1, avgProteinG || 100);
      // Interpolação linear entre 100g e 200g
      const ratio = (w - 100) / 100; // 0 em 100g, 1 em 200g
      const price = r.w100 + (r.w200 - r.w100) * ratio;
      return Math.round(price * 100) / 100;
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

    // Build a weighted description from ingredients (e.g. "150g Frango grelhado + 100g Arroz + 80g Feijão")
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const buildDesc = (it: QuoteItem): string => {
      if (it.ingredients && it.ingredients.length > 0) {
        const catOrder: Record<string, number> = { protein: 0, carb: 1, veggie: 2 };
        const parts = [...it.ingredients]
          .filter(ing => (ing.weightGrams || 0) > 0 && ing.name?.trim())
          .sort((a, b) => (catOrder[a.category] ?? 9) - (catOrder[b.category] ?? 9))
          .map(ing => `${Math.round(ing.weightGrams)}g ${cap(ing.name.trim())}`);
        if (parts.length > 0) return parts.join(" + ");
      }
      return (it.description || "").trim();
    };

    // Agrupa itens por proteína (cap em 3) + calcula peso médio da proteína por grupo
    type GroupItem = { number: number; description: string };
    const groups: { protein: ProteinKey; items: GroupItem[]; avgProteinG: number }[] = [];
    const order: ProteinKey[] = ["FRANGO", "CARNE", "PEIXE"];
    const byProtein: Record<ProteinKey, { it: QuoteItem; description: string }[]> = {
      FRANGO: [], CARNE: [], PEIXE: [],
    };
    for (const it of items) {
      byProtein[classify(it.description)].push({ it, description: buildDesc(it) });
    }
    let opNum = 1;
    for (const p of order) {
      const list = byProtein[p].slice(0, 3); // máx 3 sabores por proteína
      if (list.length === 0) continue;
      const avgProteinG = list.reduce((s, x) => s + (x.it.proteinWeight || 0), 0) / list.length;
      groups.push({
        protein: p,
        items: list.map(x => ({ number: opNum++, description: x.description })),
        avgProteinG,
      });
    }

    // Calcula preços dos kits por grupo (com override manual se fornecido)
    const kitPricesByProtein: Record<ProteinKey, { qty: number; unit: number }[]> = {
      FRANGO: [], CARNE: [], PEIXE: [],
    };
    for (const g of groups) {
      const baseOverride = kitOverrides[g.protein];
      const base = baseOverride != null ? baseOverride : basePriceFor(g.protein, g.avgProteinG);
      kitPricesByProtein[g.protein] = [
        { qty: 10, unit: Math.round(base * 100) / 100 },
        { qty: 20, unit: Math.round(base * 0.95 * 100) / 100 },
        { qty: 30, unit: Math.round(base * 0.90 * 100) / 100 },
      ];
    }
    const KIT_PRICES = kitPricesByProtein;

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

    // ── CARDÁPIOS (unificado, com badges coloridos por proteína) ──────────────
    doc.setFillColor(33, 33, 33);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("CARDÁPIOS", margin + 3, y + 5.5);
    // Legenda inline (Frango / Carne / Peixe) à direita do título
    doc.setFontSize(7.5);
    let legendX = W - margin - 3;
    [...groups].reverse().forEach((g) => {
      const pal = PALETTE[g.protein];
      const label = pal.label;
      const tw = doc.getTextWidth(label) + 6;
      doc.setFillColor(...pal.dark);
      doc.roundedRect(legendX - tw, y + 1.8, tw, 4.4, 1, 1, "F");
      doc.setTextColor(255);
      doc.text(label, legendX - tw / 2, y + 5, { align: "center" });
      legendX -= tw + 3;
    });
    y += 9;

    // Lista compacta unificada: badge "Opcao NN" colorido pela proteína + descrição
    const allItems: { number: number; description: string; protein: ProteinKey }[] = [];
    for (const g of groups) g.items.forEach(it => allItems.push({ ...it, protein: g.protein }));

    const numW = 22;
    allItems.forEach((it, i) => {
      const pal = PALETTE[it.protein];
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(it.description, contentW - numW - 8);
      const rowH = Math.max(7, 2.6 + lines.length * 4);
      const bg = i % 2 === 0 ? pal.light : [255, 255, 255] as [number, number, number];
      doc.setFillColor(...bg);
      doc.roundedRect(margin, y, contentW, rowH, 1.2, 1.2, "F");
      // badge colorido
      doc.setFillColor(...pal.dark);
      doc.roundedRect(margin + 1, y + 1, numW - 2, rowH - 2, 1, 1, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
      doc.text(`Opcao ${String(it.number).padStart(2, "0")}`, margin + numW / 2, y + rowH / 2 + 1, { align: "center" });
      // descrição
      doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      lines.forEach((ln: string, li: number) => {
        doc.text(ln, margin + numW + 3, y + 4.6 + li * 4);
      });
      y += rowH;
    });

    y += 5;

    // ── KITS E PREÇOS (tabela única: linhas = proteínas, colunas = 10/20/30) ──
    doc.setFillColor(33, 33, 33);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("KITS E PREÇOS", margin + 3, y + 5.5);
    y += 9;

    // Cabeçalho colunas: Proteína | Kit 10 | Kit 20 (-5%) | Kit 30 (-10%)
    const kcolW = [contentW * 0.22, contentW * 0.26, contentW * 0.26, contentW * 0.26];
    const kcolX = [margin];
    for (let i = 0; i < 3; i++) kcolX.push(kcolX[i] + kcolW[i]);
    const kcenters = kcolX.map((cx, i) => cx + kcolW[i] / 2);

    doc.setFillColor(220, 220, 220);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    ["Sabor", "Kit 10 un.", "Kit 20 un. (-5%)", "Kit 30 un. (-10%)"].forEach((h, i) =>
      doc.text(h, kcenters[i], y + 5, { align: "center" })
    );
    y += 7;

    groups.forEach((g, i) => {
      const pal = PALETTE[g.protein];
      const prices = KIT_PRICES[g.protein];
      const bg = i % 2 === 0 ? pal.light : [255, 255, 255] as [number, number, number];
      doc.setFillColor(...bg);
      doc.rect(margin, y, contentW, 9, "F");
      // coluna 1: nome proteína em destaque
      doc.setTextColor(...pal.dark); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.text(pal.label, kcenters[0], y + 6, { align: "center" });
      // colunas 2-4: unitário + total
      prices.forEach((k, idx) => {
        const total = k.unit * k.qty;
        const cx = kcenters[idx + 1];
        doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(`${formatCurrency(k.unit)}/un.`, cx, y + 4, { align: "center" });
        doc.setFont("helvetica", "bold"); doc.setTextColor(...pal.dark); doc.setFontSize(9);
        doc.text(formatCurrency(total), cx, y + 8, { align: "center" });
      });
      y += 9;
    });

    y += 4;

    // ── INFORMAÇÕES IMPORTANTES ───────────────────────────────────────────────
    doc.setFillColor(33, 33, 33);
    doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("INFORMAÇÕES IMPORTANTES", margin + 3, y + 5);
    y += 8;

    const tips = [
      "✓ Produzimos sempre após confirmação do pedido — tudo fresquinho!",
      "✓ Marmitas preparadas, congeladas e entregues — descongelar na hora",
      "✓ Entregamos em até 3 dias úteis após confirmação",
      "✓ Ingredientes frescos e naturais, sem ultraprocessados",
      "✓ Taxa de entrega: R$ 10,00 (cobrada à parte)",
      "✓ Pagamento via PIX: chave informada via WhatsApp",
      "✓ Pagamento no cartão: acréscimo de 5% sobre o valor total",
      "✓ Legumes: Mix de cenoura, chuchu, abobrinha, vagem, brócolis",
      "✓ Salada de folhas (opcional): alface, rúcula, acelga — pode ser refogada",
      "✓ Validade do produto: 90 dias congelado no freezer",
    ];
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GREY_TXT);
    // duas colunas para caber tudo
    const colW = contentW / 2;
    const lineH = 4.2;
    const half = Math.ceil(tips.length / 2);
    tips.forEach((t, i) => {
      const col = i < half ? 0 : 1;
      const row = i < half ? i : i - half;
      doc.text(t, margin + col * colW + (col === 1 ? 2 : 0), y + 3 + row * lineH);
    });
    y += half * lineH + 4;

    // ── CONTATO (rodapé final) ────────────────────────────────────────────────
    doc.setDrawColor(180); doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 4;
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(0);
    doc.text("Obrigado pela preferência! Ficamos à disposição para qualquer dúvida.", W / 2, y, { align: "center" });
    y += 4.5;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...GREY_TXT);
    const contactPhone = tenant?.whatsapp_formatted || tenant?.whatsapp || "";
    const contactLine = `${brandName}${contactPhone ? "  •  " + contactPhone : ""}`;
    doc.text(contactLine, W / 2, y, { align: "center" });

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

          {/* Override manual dos preços do Kit 10 no PDF (por proteína) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Preços dos Kits no PDF</CardTitle>
              <p className="text-xs text-muted-foreground">
                Deixe em branco para calcular automaticamente pelo peso da proteína (100g/200g). Kits 20 = −5%, Kit 30 = −10%.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["FRANGO", "CARNE", "PEIXE"] as const).map((p) => (
                  <div key={p}>
                    <Label className="text-xs">Kit 10 {p} (R$/un.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="auto"
                      value={kitOverrides[p] ?? ""}
                      onChange={(e) =>
                        setKitOverrides((prev) => ({
                          ...prev,
                          [p]: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      className={kitOverrides[p] != null ? "border-primary ring-1 ring-primary/30" : ""}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
