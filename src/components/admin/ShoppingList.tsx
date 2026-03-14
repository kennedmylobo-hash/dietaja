import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFlavorSidesForLine, mapLineTypeToKey, FlavorSideItem, generateDefaultSides } from "@/lib/flavor-description";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Printer, Share2, RefreshCw, Loader2, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FlavorItem {
  name: string;
  quantity: number;
  category?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
  flavors?: FlavorItem[];
  lineType?: string;
}

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  items: OrderItem[];
  customer_name: string;
  created_at: string;
}

interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
  sides: { name: string; weight: number }[] | null;
}

interface KitJuice { id: string; emoji: string; name: string; }
interface KitSoup { id: string; emoji: string; name: string; }

interface ShoppingItem {
  name: string;
  netWeight: number;      // grams needed (cooked/clean)
  grossWeight: number;     // grams to buy (raw)
  factor: number;          // cooking/cleaning factor
  category: 'protein' | 'carb' | 'salad' | 'juice' | 'soup';
  unit: 'g' | 'un';
  breakdown?: { prep: string; netWeight: number; grossWeight: number }[];
}

// ── Protein ingredient mapping (flavor → raw ingredient for purchasing) ──
// Order matters: more specific patterns must come first
const PROTEIN_INGREDIENT_MAP: [RegExp, string][] = [
  [/estrogonofe\s+de\s+carne/i, 'Carne pedaço'],
  [/estrogonofe\s+de\s+frango/i, 'Frango'],
  [/alm[oô]nd[ei]ga/i, 'Carne moída'],
  [/carne\s+desfiada/i, 'Carne pedaço'],
  [/escondidinho\s+de\s+carne/i, 'Carne moída'],
  [/escondidinho\s+de\s+frango/i, 'Frango'],
  [/carne\s+mo[ií]da/i, 'Carne moída'],
  [/til[aá]pia/i, 'Tilápia'],
  [/peixe/i, 'Tilápia'],
  [/lingu[ií][cç]a/i, 'Linguiça'],
  [/porco/i, 'Linguiça'],
  [/frango/i, 'Frango'],
  [/carne/i, 'Carne pedaço'],
];

// Resolve the preparation type for frango (for breakdown detail)
const FRANGO_PREP_MAP: [RegExp, string][] = [
  [/frango\s+(em\s+)?cubos/i, 'em cubos'],
  [/frango\s+desfiado/i, 'desfiado'],
  [/frango\s+grelhado/i, 'grelhado'],
  [/frango\s+empanado/i, 'empanado'],
  [/estrogonofe\s+de\s+frango/i, 'estrogonofe'],
  [/escondidinho\s+de\s+frango/i, 'desfiado'],
];

const resolvePreparation = (flavorName: string): string | null => {
  for (const [pattern, prep] of FRANGO_PREP_MAP) {
    if (pattern.test(flavorName) || pattern.test(flavorName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return prep;
  }
  return null;
};

const resolveProteinIngredient = (flavorName: string): string => {
  const normalized = flavorName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [pattern, ingredient] of PROTEIN_INGREDIENT_MAP) {
    if (pattern.test(normalized) || pattern.test(flavorName)) return ingredient;
  }
  return flavorName.split(/\s+com\s+|,\s*/i)[0].trim();
};

// Default cooking/cleaning factors (gross = net * factor)
const DEFAULT_FACTORS: Record<string, number> = {
  // Proteins (raw ingredient names)
  'carne pedaço': 1.35,
  'carne moída': 1.30,
  'filé de peito de frango': 1.40,
  'frango em cubos': 1.40,
  'frango desfiado': 1.40,
  'frango grelhado': 1.40,
  'frango empanado': 1.30,
  'frango (filé de peito)': 1.40,
  'frango (estrogonofe)': 1.40,
  'tilápia': 1.45,
  'linguiça': 1.15,
  'ovo': 1.10,
  // Carbs
  'arroz': 2.50,
  'feijão': 2.20,
  'feijao': 2.20,
  'aipim': 1.25,
  'mandioca': 1.25,
  'batata': 1.15,
  'batata doce': 1.15,
  'purê': 1.20,
  'pure': 1.20,
  'macarrão': 2.00,
  'macarrao': 2.00,
  'nhoque': 1.80,
  'grãos': 2.00,
  'graos': 2.00,
  // Salads/Vegetables
  'mix de salada': 1.20,
  'mix de legumes': 1.25,
  'brócolis': 1.20,
  'brocolis': 1.20,
  'cenoura': 1.15,
  'abobrinha': 1.20,
  'vagem': 1.15,
  'chuchu': 1.20,
  'legumes': 1.25,
  'salada': 1.20,
};

const STORAGE_KEY = 'shopping-list-factors';

const loadSavedFactors = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_FACTORS, ...JSON.parse(saved) } : { ...DEFAULT_FACTORS };
  } catch {
    return { ...DEFAULT_FACTORS };
  }
};

const saveFactor = (name: string, factor: number) => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    saved[name] = factor;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch { /* ignore */ }
};

const getFactor = (ingredientName: string, factors: Record<string, number>): number => {
  const lower = ingredientName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Try exact match
  if (factors[lower]) return factors[lower];
  // Try partial match
  for (const [key, val] of Object.entries(factors)) {
    const normKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(normKey) || normKey.includes(lower)) return val;
  }
  return 1.0; // No factor = 1:1
};

const classifyIngredient = (name: string): 'protein' | 'carb' | 'salad' => {
  const lower = name.toLowerCase();
  const proteinKeywords = ['frango', 'carne', 'peixe', 'tilápia', 'tilapia', 'almôndega', 'almondega', 'linguiça', 'linguica', 'bacon', 'calabresa', 'costela', 'cupim', 'charque', 'pernil', 'lombo', 'bisteca', 'filé', 'file', 'estrogonofe', 'strogonoff'];
  if (proteinKeywords.some(k => lower.includes(k))) return 'protein';
  const carbKeywords = ['arroz', 'aipim', 'batata', 'purê', 'pure', 'feijão', 'feijao', 'grãos', 'graos', 'macarrão', 'macarrao', 'nhoque', 'mandioca', 'farinha', 'risoto', 'molho'];
  if (carbKeywords.some(k => lower.includes(k))) return 'carb';
  const saladKeywords = ['mix', 'salada', 'legume', 'brócolis', 'brocolis', 'chuchu', 'cenoura', 'abobrinha', 'vagem'];
  if (saladKeywords.some(k => lower.includes(k))) return 'salad';
  return 'protein';
};

const normForMatch = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

interface ShoppingListProps {
  dateFilter: 'today' | 'week' | 'month';
}

const JUICE_UNIT_ML = 300;
const SOUP_UNIT_ML = 450;

const ShoppingList = ({ dateFilter }: ShoppingListProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [marmitaFlavors, setMarmitaFlavors] = useState<MarmitaFlavor[]>([]);
  const [kitJuices, setKitJuices] = useState<KitJuice[]>([]);
  const [kitSoups, setKitSoups] = useState<KitSoup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [factors, setFactors] = useState<Record<string, number>>(loadSavedFactors);
  const [showFactors, setShowFactors] = useState(false);
  const [editingFactor, setEditingFactor] = useState<string | null>(null);

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    switch (dateFilter) {
      case 'today': start.setHours(0, 0, 0, 0); break;
      case 'week': start.setDate(now.getDate() - 7); break;
      case 'month': start.setDate(now.getDate() - 30); break;
    }
    return start.toISOString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    const startDate = getDateRange();
    try {
      const [ordersRes, flavorsRes, juicesRes, soupsRes] = await Promise.all([
        supabase.from('orders').select('id, order_number, status, items, customer_name, created_at')
          .gte('created_at', startDate)
          .in('status', ['approved', 'preparing', 'ready', 'whatsapp_pending'])
          .order('created_at', { ascending: false }),
        supabase.from('marmita_flavors').select('id, name, category, sides').eq('active', true),
        supabase.from('kit_juices').select('id, emoji, name').eq('active', true),
        supabase.from('kit_soups').select('id, emoji, name').eq('active', true),
      ]);
      if (ordersRes.data) setOrders(ordersRes.data as unknown as Order[]);
      if (flavorsRes.data) setMarmitaFlavors(flavorsRes.data as unknown as MarmitaFlavor[]);
      if (juicesRes.data) setKitJuices(juicesRes.data);
      if (soupsRes.data) setKitSoups(soupsRes.data);
    } catch (error) {
      console.error('Error fetching shopping list data:', error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  const getFlavorComposition = (flavorName: string, lineType?: string): FlavorSideItem[] => {
    const lineKey = lineType ? mapLineTypeToKey(lineType) : 'fit';
    const normalizedFlavorName = normForMatch(flavorName);

    let flavor = marmitaFlavors.find(f => normForMatch(f.name) === normalizedFlavorName);

    if (!flavor) {
      const corePart = normalizedFlavorName.split(/[,]|\s+com\s+/)[0].trim();
      let bestScore = 0;
      for (const f of marmitaFlavors) {
        const candidateNorm = normForMatch(f.name);
        const candidateCore = candidateNorm.split(/[,]|\s+com\s+/)[0].trim();
        if (corePart !== candidateCore && !candidateCore.includes(corePart) && !corePart.includes(candidateCore)) continue;
        const sideKeywords = ['aipim', 'arroz', 'batata', 'feijao', 'graos', 'pure', 'legumes', 'salada'];
        const userSides = sideKeywords.filter(k => normalizedFlavorName.includes(k));
        const candidateSides = sideKeywords.filter(k => candidateNorm.includes(k));
        const overlap = userSides.filter(k => candidateSides.includes(k)).length;
        const score = overlap + (candidateCore.includes(corePart) ? 2 : 0);
        if (score > bestScore) { bestScore = score; flavor = f; }
      }
    }

    if (flavor?.sides) {
      const lineSides = getFlavorSidesForLine(flavor.sides as any, lineKey);
      if (lineSides && lineSides.length > 0) return lineSides;
      if (Array.isArray(flavor.sides) && (flavor.sides as any[]).length > 0) {
        return flavor.sides as unknown as FlavorSideItem[];
      }
    }

    return generateDefaultSides(flavorName, lineKey);
  };

  const shoppingItems = useMemo(() => {
    const ingredientMap = new Map<string, { netWeight: number; category: 'protein' | 'carb' | 'salad' }>();
    const prepBreakdown = new Map<string, Map<string, number>>(); // ingredientKey → prep → netWeight
    const juiceMap = new Map<string, number>();
    const soupMap = new Map<string, number>();

    for (const order of orders) {
      if (!order.items || !Array.isArray(order.items)) continue;

      for (const item of order.items) {
        if (item.flavors && Array.isArray(item.flavors)) {
          for (const flavor of item.flavors) {
            const flavorCategory = flavor.category?.toLowerCase() || '';

            if (flavorCategory === 'suco') {
              juiceMap.set(flavor.name, (juiceMap.get(flavor.name) || 0) + flavor.quantity);
              continue;
            }
            if (flavorCategory === 'sopa') {
              soupMap.set(flavor.name, (soupMap.get(flavor.name) || 0) + flavor.quantity);
              continue;
            }

            const itemLineType = item.lineType ||
              (item.name.toLowerCase().includes('fitness') || item.name.toLowerCase().includes('hipertrofia') ? 'hipertrofia' : 'emagrecimento');
            const flavorSides = getFlavorComposition(flavor.name, itemLineType);

            for (let i = 0; i < flavorSides.length; i++) {
              const ingredient = flavorSides[i];
              const isProtein = i === 0;
              const displayName = isProtein
                ? resolveProteinIngredient(flavor.name)
                : ingredient.name;
              const key = displayName.toLowerCase();
              const totalWeight = flavor.quantity * ingredient.weight;
              const type = isProtein ? 'protein' as const : classifyIngredient(ingredient.name);

              const existing = ingredientMap.get(key);
              if (existing) {
                existing.netWeight += totalWeight;
              } else {
                ingredientMap.set(key, { netWeight: totalWeight, category: type });
              }

              // Track preparation breakdown for proteins (frango, carne, etc.)
              if (isProtein) {
                const prep = resolvePreparation(flavor.name);
                if (prep) {
                  if (!prepBreakdown.has(key)) prepBreakdown.set(key, new Map());
                  const preps = prepBreakdown.get(key)!;
                  preps.set(prep, (preps.get(prep) || 0) + totalWeight);
                }
              }
            }
          }
        }

        // Standalone juices/soups
        const itemNameLower = item.name.toLowerCase();
        if (itemNameLower.includes('suco') || item.type === 'juice') {
          const juice = kitJuices.find(j =>
            itemNameLower.includes(j.name.toLowerCase()) ||
            j.name.toLowerCase().includes(itemNameLower.replace('suco', '').trim())
          );
          if (juice) juiceMap.set(juice.name, (juiceMap.get(juice.name) || 0) + item.quantity);
        }
        if (itemNameLower.includes('sopa') || item.type === 'soup') {
          const soup = kitSoups.find(s =>
            itemNameLower.includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(itemNameLower.replace('sopa', '').trim())
          );
          if (soup) soupMap.set(soup.name, (soupMap.get(soup.name) || 0) + item.quantity);
        }
      }
    }

    const items: ShoppingItem[] = [];

    // Add ingredient items with cooking factor
    for (const [key, { netWeight, category }] of ingredientMap) {
      const displayName = key.charAt(0).toUpperCase() + key.slice(1);
      const factor = getFactor(key, factors);
      const grossWeight = Math.ceil(netWeight * factor);

      // Build breakdown if available (multiple preps for same ingredient)
      const preps = prepBreakdown.get(key);
      let breakdown: ShoppingItem['breakdown'];
      if (preps && preps.size > 1) {
        breakdown = Array.from(preps.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([prep, w]) => ({ prep, netWeight: w, grossWeight: Math.ceil(w * factor) }));
      }

      items.push({
        name: displayName,
        netWeight,
        grossWeight,
        factor,
        category,
        unit: 'g',
        breakdown,
      });
    }

    // Add juices
    for (const [name, qty] of juiceMap) {
      items.push({
        name: `🥤 ${name}`,
        netWeight: qty,
        grossWeight: qty,
        factor: 1,
        category: 'juice',
        unit: 'un',
      });
    }

    // Add soups
    for (const [name, qty] of soupMap) {
      items.push({
        name: `🥣 ${name}`,
        netWeight: qty,
        grossWeight: qty,
        factor: 1,
        category: 'soup',
        unit: 'un',
      });
    }

    // Sort: proteins first, then carbs, then salads, then juices/soups
    const typeOrder: Record<string, number> = { protein: 0, carb: 1, salad: 2, juice: 3, soup: 4 };
    items.sort((a, b) => {
      const oa = typeOrder[a.category] ?? 5;
      const ob = typeOrder[b.category] ?? 5;
      if (oa !== ob) return oa - ob;
      return b.grossWeight - a.grossWeight;
    });

    return items;
  }, [orders, marmitaFlavors, kitJuices, kitSoups, factors]);

  const handleFactorChange = (itemName: string, newFactor: number) => {
    if (newFactor <= 0 || isNaN(newFactor)) return;
    const key = itemName.toLowerCase();
    setFactors(prev => ({ ...prev, [key]: newFactor }));
    saveFactor(key, newFactor);
    setEditingFactor(null);
  };

  const formatWeight = (grams: number): string => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
    return `${grams} g`;
  };

  const categoryLabel: Record<string, { emoji: string; label: string }> = {
    protein: { emoji: '🥩', label: 'PROTEÍNAS' },
    carb: { emoji: '🍚', label: 'CARBOIDRATOS' },
    salad: { emoji: '🥗', label: 'SALADA / LEGUMES' },
    juice: { emoji: '🥤', label: 'SUCOS' },
    soup: { emoji: '🥣', label: 'SOPAS' },
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    for (const item of shoppingItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [shoppingItems]);

  const generateWhatsApp = (): string => {
    const parts: string[] = ['🛒 *LISTA DE COMPRAS*', `📅 ${dateFilter === 'today' ? 'Hoje' : dateFilter === 'week' ? 'Semana' : 'Mês'}`, `📦 ${orders.length} pedidos`, ''];

    for (const [cat, info] of Object.entries(categoryLabel)) {
      const items = groupedItems[cat];
      if (!items?.length) continue;
      parts.push(`${info.emoji} *${info.label}*`);
      for (const item of items) {
        if (item.unit === 'un') {
          parts.push(`  ☐ ${item.name}: ${item.grossWeight} un`);
        } else {
          const factorNote = item.factor > 1 ? ` (fator ${item.factor}x)` : '';
          parts.push(`  ☐ ${item.name}: ${formatWeight(item.grossWeight)}${factorNote}`);
          if (item.breakdown?.length) {
            for (const b of item.breakdown) {
              parts.push(`      ↳ ${b.prep}: ${formatWeight(b.grossWeight)}`);
            }
          }
        }
      }
      parts.push('');
    }

    return parts.join('\n');
  };

  const handlePrint = () => {
    const now = new Date().toLocaleDateString('pt-BR');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Lista de Compras - ${now}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:16px;max-width:500px;margin:0 auto;font-size:12px;}
        h1{font-size:16px;text-align:center;margin-bottom:4px;}
        .subtitle{text-align:center;font-size:11px;color:#666;margin-bottom:12px;}
        .category{background:#333;color:#fff;padding:4px 8px;font-size:11px;font-weight:bold;border-radius:3px;margin-top:12px;margin-bottom:4px;}
        .item{display:flex;justify-content:space-between;padding:3px 8px;border-bottom:1px dotted #ddd;}
        .item-name{display:flex;align-items:center;gap:6px;}
        .checkbox{width:12px;height:12px;border:1.5px solid #333;border-radius:2px;display:inline-block;}
        .factor{font-size:9px;color:#999;}
        .net{font-size:10px;color:#888;margin-left:4px;}
        @media print{body{padding:8px;}}
      </style></head><body>
      <h1>🛒 LISTA DE COMPRAS</h1>
      <div class="subtitle">${now} • ${orders.length} pedidos</div>
      ${Object.entries(categoryLabel).map(([cat, info]) => {
        const items = groupedItems[cat];
        if (!items?.length) return '';
        return `<div class="category">${info.emoji} ${info.label}</div>
          ${items.map(item => `<div class="item">
            <span class="item-name"><span class="checkbox"></span> ${item.name}</span>
            <span>
              <strong>${item.unit === 'un' ? `${item.grossWeight} un` : formatWeight(item.grossWeight)}</strong>
              ${item.factor > 1 ? `<span class="net">(líq: ${formatWeight(item.netWeight)})</span><span class="factor"> ${item.factor}x</span>` : ''}
            </span>
          </div>${item.breakdown?.length ? item.breakdown.map(b => `<div style="padding:1px 8px 1px 30px;font-size:10px;color:#666;">↳ ${b.prep}: ${formatWeight(b.grossWeight)}</div>`).join('') : ''}`).join('')}`;
      }).join('')}
      </body></html>`;

    const w = window.open('', '_blank', 'width=500,height=700');
    if (!w) { toast({ title: "Habilite pop-ups para imprimir", variant: "destructive" }); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsApp();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Lista de Compras</h2>
          <Badge variant="secondary">{orders.length} pedidos</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFactors(!showFactors)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Fatores
            {showFactors ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
            <Share2 className="h-4 w-4 mr-1" /> WhatsApp
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {showFactors && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">⚙️ Fatores de Cocção / Limpeza</CardTitle>
            <p className="text-xs text-muted-foreground">
              Multiplica o peso líquido (cozido) pelo fator para obter o peso bruto (cru) que precisa comprar. Ex: Frango 1.4x = para cada 100g cozido, compre 140g cru.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {Object.entries(factors)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, factor]) => (
                <div key={name} className="flex items-center gap-1 p-1 rounded border">
                  <span className="flex-1 capitalize truncate">{name}</span>
                  {editingFactor === name ? (
                    <Input
                      type="number"
                      step="0.05"
                      min="1"
                      defaultValue={factor}
                      className="w-16 h-6 text-xs"
                      autoFocus
                      onBlur={(e) => handleFactorChange(name, parseFloat(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFactorChange(name, parseFloat((e.target as HTMLInputElement).value));
                        if (e.key === 'Escape') setEditingFactor(null);
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingFactor(name)}
                      className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono hover:bg-primary/10 transition"
                    >
                      {factor}x
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {shoppingItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum pedido confirmado no período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(categoryLabel).map(([cat, info]) => {
            const items = groupedItems[cat];
            if (!items?.length) return null;
            return (
              <Card key={cat}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{info.emoji}</span> {info.label}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Ingrediente</TableHead>
                        {cat !== 'juice' && cat !== 'soup' && (
                          <>
                            <TableHead className="text-xs text-right">Líquido (cozido)</TableHead>
                            <TableHead className="text-xs text-right">Fator</TableHead>
                          </>
                        )}
                        <TableHead className="text-xs text-right font-bold">Comprar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <React.Fragment key={item.name}>
                          <TableRow>
                            <TableCell className="text-sm py-2">{item.name}</TableCell>
                            {cat !== 'juice' && cat !== 'soup' && (
                              <>
                                <TableCell className="text-sm text-right text-muted-foreground py-2">
                                  {formatWeight(item.netWeight)}
                                </TableCell>
                                <TableCell className="text-xs text-right py-2">
                                  {item.factor > 1 ? (
                                    <button
                                      onClick={() => setEditingFactor(item.name.toLowerCase())}
                                      className="px-1 py-0.5 bg-muted rounded font-mono hover:bg-primary/10 transition"
                                    >
                                      {item.factor}x
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground">1x</span>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-sm text-right font-bold py-2">
                              {item.unit === 'un' ? `${item.grossWeight} un` : formatWeight(item.grossWeight)}
                            </TableCell>
                          </TableRow>
                          {item.breakdown?.map(b => (
                            <TableRow key={b.prep} className="border-0">
                              <TableCell className="text-xs text-muted-foreground py-0.5 pl-8" colSpan={cat !== 'juice' && cat !== 'soup' ? 3 : 1}>
                                ↳ {b.prep}
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground py-0.5">
                                {formatWeight(b.grossWeight)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShoppingList;
