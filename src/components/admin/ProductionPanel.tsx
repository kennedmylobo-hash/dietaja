import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFlavorSidesForLine, mapLineTypeToKey, FlavorSideItem, generateDefaultSides } from "@/lib/flavor-description";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Share2, RefreshCw, ChefHat, Loader2, Package, Utensils, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatDateShort } from "@/lib/print-utils";
import { generateLabelsA7 } from "@/lib/label-utils";

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

interface MarmitaSide {
  id: string;
  name: string;
  weight_grams: number;
  category: string;
}

interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
  sides: { name: string; weight: number }[] | null;
}

interface KitJuice {
  id: string;
  emoji: string;
  name: string;
}

interface KitSoup {
  id: string;
  emoji: string;
  name: string;
}

// Classify a side ingredient as carb or salad
const classifyIngredient = (name: string): 'carb' | 'salad' => {
  const lower = name.toLowerCase();
  const carbKeywords = ['arroz', 'aipim', 'batata', 'purê', 'pure', 'feijão', 'feijao', 'grãos', 'graos', 'macarrão', 'macarrao', 'nhoque', 'mandioca', 'farinha', 'risoto'];
  return carbKeywords.some(k => lower.includes(k)) ? 'carb' : 'salad';
};

// For kitchen: aggregated ingredients
interface IngredientTotal {
  name: string;
  totalWeight: number; // in grams
  type: 'protein' | 'carb' | 'salad' | 'juice' | 'soup';
  emoji?: string;
  count?: number; // for items counted by unit (juices, soups)
}

// For assembly: unique marmita combinations
interface AssemblyCombination {
  key: string;
  flavorName: string;
  ingredients: { name: string; weight: number; type: 'protein' | 'carb' | 'salad' }[];
  quantity: number;
  customers: { name: string; quantity: number }[];
  lineType: 'fit' | 'fitness';
}

interface ProductionPanelProps {
  dateFilter: 'today' | 'week' | 'month';
}

const DEFAULT_PROTEIN_WEIGHT = 150; // Default protein weight when sides not configured
const JUICE_UNIT_ML = 300;  // Sucos são de 300ml por unidade
const SOUP_UNIT_ML = 450;   // Sopas são de 450ml por unidade

// Format juice display: X un (Y L) or X un (Y ml)
const formatJuiceDisplay = (quantity: number): string => {
  const totalMl = quantity * JUICE_UNIT_ML;
  const liters = totalMl / 1000;
  return liters >= 1 
    ? `${quantity} un (${liters.toFixed(1)}L)` 
    : `${quantity} un (${totalMl}ml)`;
};

// Format soup display: X un
const formatSoupDisplay = (quantity: number): string => {
  return `${quantity} un`;
};

const ProductionPanel = ({ dateFilter }: ProductionPanelProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [marmitaSides, setMarmitaSides] = useState<MarmitaSide[]>([]);
  const [marmitaFlavors, setMarmitaFlavors] = useState<MarmitaFlavor[]>([]);
  const [kitJuices, setKitJuices] = useState<KitJuice[]>([]);
  const [kitSoups, setKitSoups] = useState<KitSoup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('production');

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    
    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        break;
    }
    
    return start.toISOString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    const startDate = getDateRange();

    try {
      const [ordersRes, sidesRes, flavorsRes, juicesRes, soupsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, status, items, customer_name, created_at')
          .gte('created_at', startDate)
          .in('status', ['approved', 'preparing', 'ready', 'whatsapp_pending'])
          .order('created_at', { ascending: false }),
        supabase.from('marmita_sides').select('*').eq('active', true).order('sort_order'),
        supabase.from('marmita_flavors').select('id, name, category, sides').eq('active', true),
        supabase.from('kit_juices').select('id, emoji, name').eq('active', true).order('sort_order'),
        supabase.from('kit_soups').select('id, emoji, name').eq('active', true).order('sort_order'),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as unknown as Order[]);
      if (sidesRes.data) setMarmitaSides(sidesRes.data);
      if (flavorsRes.data) setMarmitaFlavors(flavorsRes.data as unknown as MarmitaFlavor[]);
      if (juicesRes.data) setKitJuices(juicesRes.data);
      if (soupsRes.data) setKitSoups(soupsRes.data);
    } catch (error) {
      console.error('Error fetching production data:', error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  // Filter orders by status
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'production') {
      return orders.filter(o => ['approved', 'preparing'].includes(o.status));
    }
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Normalize for comparison: remove accents, lowercase
  const normForMatch = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Get sides config for a flavor, considering line_type
  // Uses fuzzy matching to find the closest catalog entry
  const getFlavorComposition = (flavorName: string, lineType?: string): { items: FlavorSideItem[], isConfigured: boolean } => {
    const lineKey = lineType ? mapLineTypeToKey(lineType) : 'fit';
    const normalizedFlavorName = normForMatch(flavorName);

    // 1. Try exact match first
    let flavor = marmitaFlavors.find(f => normForMatch(f.name) === normalizedFlavorName);

    // 2. If no exact match, try substring/keyword matching
    if (!flavor) {
      // Extract core protein part (before comma/com)
      const corePart = normalizedFlavorName.split(/[,]|\s+com\s+/)[0].trim();
      
      let bestScore = 0;
      for (const f of marmitaFlavors) {
        const candidateNorm = normForMatch(f.name);
        const candidateCore = candidateNorm.split(/[,]|\s+com\s+/)[0].trim();
        
        // Core protein must match
        if (corePart !== candidateCore && !candidateCore.includes(corePart) && !corePart.includes(candidateCore)) continue;
        
        // Score based on side-dish keyword overlap
        const sideKeywords = ['aipim', 'arroz', 'batata', 'feijao', 'graos', 'pure', 'legumes', 'salada'];
        const userSides = sideKeywords.filter(k => normalizedFlavorName.includes(k));
        const candidateSides = sideKeywords.filter(k => candidateNorm.includes(k));
        const overlap = userSides.filter(k => candidateSides.includes(k)).length;
        const score = overlap + (candidateCore.includes(corePart) ? 2 : 0);
        
        if (score > bestScore) {
          bestScore = score;
          flavor = f;
        }
      }
    }

    if (flavor?.sides) {
      const lineSides = getFlavorSidesForLine(flavor.sides as any, lineKey);
      if (lineSides && lineSides.length > 0) return { items: lineSides, isConfigured: true };
      
      // Fallback: old flat array format
      if (Array.isArray(flavor.sides) && (flavor.sides as any[]).length > 0) {
        return { items: flavor.sides as unknown as FlavorSideItem[], isConfigured: true };
      }
    }

    // Smart fallback: generate composition from item name instead of generic Arroz+Feijão
    return {
      items: generateDefaultSides(flavorName, lineKey),
      isConfigured: false,
    };
  };

  // Production data calculation
  const productionData = useMemo(() => {
    // KITCHEN LIST: Aggregate ALL ingredients across all marmitas
    const ingredientMap = new Map<string, IngredientTotal>();
    
    // ASSEMBLY LIST: Track unique combinations
    const assemblyMap = new Map<string, AssemblyCombination>();
    
    // Track juices and soups
    const juiceMap = new Map<string, { emoji: string; name: string; quantity: number }>();
    const soupMap = new Map<string, { emoji: string; name: string; quantity: number }>();

    for (const order of filteredOrders) {
      if (!order.items || !Array.isArray(order.items)) continue;

      for (const item of order.items) {
        // Process marmitas with flavors
        if (item.flavors && Array.isArray(item.flavors)) {
          for (const flavor of item.flavors) {
            const flavorCategory = flavor.category?.toLowerCase() || '';
            
            // === CHECK IF JUICE - Add to juiceMap instead of proteins ===
            if (flavorCategory === 'suco') {
              const juiceEmoji = kitJuices.find(j => 
                j.name.toLowerCase().includes(flavor.name.toLowerCase().replace('suco ', '').replace('suco', '').trim()) ||
                flavor.name.toLowerCase().includes(j.name.toLowerCase())
              )?.emoji || '🥤';
              const key = flavor.name;
              const existing = juiceMap.get(key);
              if (existing) {
                existing.quantity += flavor.quantity;
              } else {
                juiceMap.set(key, { emoji: juiceEmoji, name: flavor.name, quantity: flavor.quantity });
              }
              continue; // Don't process as protein
            }
            
            // === CHECK IF SOUP - Add to soupMap instead of proteins ===
            if (flavorCategory === 'sopa') {
              const soupEmoji = kitSoups.find(s => 
                s.name.toLowerCase().includes(flavor.name.toLowerCase().replace('sopa de ', '').replace('sopa', '').trim()) ||
                flavor.name.toLowerCase().includes(s.name.toLowerCase())
              )?.emoji || '🥣';
              const key = flavor.name;
              const existing = soupMap.get(key);
              if (existing) {
                existing.quantity += flavor.quantity;
              } else {
                soupMap.set(key, { emoji: soupEmoji, name: flavor.name, quantity: flavor.quantity });
              }
              continue; // Don't process as protein
            }
            
            // === Normal marmita processing ===
            const itemLineType = item.lineType || 
              (item.name.toLowerCase().includes('fitness') || item.name.toLowerCase().includes('hipertrofia') ? 'hipertrofia' : 'emagrecimento');
            const { items: flavorSides, isConfigured } = getFlavorComposition(flavor.name, itemLineType);
            
            if (isConfigured) {
              // Sides JSONB already includes protein as first item
              // Iterate ALL items, classify each one
              for (let i = 0; i < flavorSides.length; i++) {
                const ingredient = flavorSides[i];
                // For protein (first item), use the specific name from the flavor
                // e.g. "Frango em cubos" instead of generic "Frango"
                const isProtein = i === 0;
                const displayName = isProtein
                  ? flavor.name.split(/\s+com\s+|,\s*/i)[0].trim()
                  : ingredient.name;
                const ingredientKey = displayName.toLowerCase();
                const existing = ingredientMap.get(ingredientKey);
                const totalWeight = flavor.quantity * ingredient.weight;
                const type = isProtein ? 'protein' as const : classifyIngredient(ingredient.name);
                
                if (existing) {
                  existing.totalWeight += totalWeight;
                } else {
                  ingredientMap.set(ingredientKey, {
                    name: displayName,
                    totalWeight: totalWeight,
                    type,
                  });
                }
              }
            } else {
              // Fallback: generateDefaultSides already includes protein as first item
              // Use same processing as configured path
              for (let i = 0; i < flavorSides.length; i++) {
                const ingredient = flavorSides[i];
                const isProtein = i === 0;
                const displayName = isProtein
                  ? flavor.name.split(/\s+com\s+|,\s*/i)[0].trim()
                  : ingredient.name;
                const ingredientKey = displayName.toLowerCase();
                const existing = ingredientMap.get(ingredientKey);
                const totalWeight = flavor.quantity * ingredient.weight;
                const type = isProtein ? 'protein' as const : classifyIngredient(ingredient.name);
                
                if (existing) {
                  existing.totalWeight += totalWeight;
                } else {
                  ingredientMap.set(ingredientKey, {
                    name: displayName,
                    totalWeight: totalWeight,
                    type,
                  });
                }
              }
            }

            // === ASSEMBLY LIST: Build full ingredients list ===
            const lineLabel = (itemLineType === 'hipertrofia' || itemLineType === 'fitness') ? 'fitness' : 'fit';
            const allIngredients: AssemblyCombination['ingredients'] = 
              flavorSides.map((s, i) => ({ name: s.name, weight: s.weight, type: (i === 0 ? 'protein' as const : classifyIngredient(s.name)) }));
            
            const ingredientsKey = allIngredients
              .map(s => `${s.name}:${s.weight}`)
              .sort()
              .join('|');
            const combinationKey = `${lineLabel}:${flavor.name}:${ingredientsKey}`;
            
            const existingCombination = assemblyMap.get(combinationKey);
            
            if (existingCombination) {
              existingCombination.quantity += flavor.quantity;
              const customerIdx = existingCombination.customers.findIndex(
                c => c.name === order.customer_name
              );
              if (customerIdx >= 0) {
                existingCombination.customers[customerIdx].quantity += flavor.quantity;
              } else {
                existingCombination.customers.push({
                  name: order.customer_name,
                  quantity: flavor.quantity,
                });
              }
            } else {
              assemblyMap.set(combinationKey, {
                key: combinationKey,
                flavorName: flavor.name,
                ingredients: allIngredients,
                quantity: flavor.quantity,
                customers: [{ name: order.customer_name, quantity: flavor.quantity }],
                lineType: lineLabel,
              });
            }
          }
        }

        // Process juices
        const itemNameLower = item.name.toLowerCase();
        
        if (itemNameLower.includes('suco') || item.type === 'juice') {
          const juice = kitJuices.find(j => 
            itemNameLower.includes(j.name.toLowerCase()) || 
            j.name.toLowerCase().includes(itemNameLower.replace('suco', '').trim())
          );
          if (juice) {
            const key = juice.name;
            const existing = juiceMap.get(key);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              juiceMap.set(key, { emoji: juice.emoji, name: juice.name, quantity: item.quantity });
            }
          }
        }

        // Process soups
        if (itemNameLower.includes('sopa') || item.type === 'soup') {
          const soup = kitSoups.find(s => 
            itemNameLower.includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(itemNameLower.replace('sopa', '').trim())
          );
          if (soup) {
            const key = soup.name;
            const existing = soupMap.get(key);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              soupMap.set(key, { emoji: soup.emoji, name: soup.name, quantity: item.quantity });
            }
          }
        }
      }
    }

    // Convert maps to sorted arrays
    const typeOrder: Record<string, number> = { protein: 0, carb: 1, salad: 2 };
    const ingredients = Array.from(ingredientMap.values()).sort((a, b) => {
      const orderA = typeOrder[a.type] ?? 3;
      const orderB = typeOrder[b.type] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      return b.totalWeight - a.totalWeight;
    });

    const assemblyCombinations = Array.from(assemblyMap.values())
      .sort((a, b) => b.quantity - a.quantity);

    const juices = Array.from(juiceMap.values()).sort((a, b) => b.quantity - a.quantity);
    const soups = Array.from(soupMap.values()).sort((a, b) => b.quantity - a.quantity);

    const totals = {
      marmitas: assemblyCombinations.reduce((sum, c) => sum + c.quantity, 0),
      juices: juices.reduce((sum, j) => sum + j.quantity, 0),
      soups: soups.reduce((sum, s) => sum + s.quantity, 0),
    };

    return { ingredients, assemblyCombinations, juices, soups, totals };
  }, [filteredOrders, marmitaFlavors, kitJuices, kitSoups]);

  // Format weight display
  const formatWeight = (grams: number): string => {
    if (grams >= 1000) {
      const kg = grams / 1000;
      return kg % 1 === 0 ? `${kg}kg` : `${kg.toFixed(2)}kg`;
    }
    return `${grams}g`;
  };

  // Print production list
  const handlePrintProduction = () => {
    const today = formatDateShort(new Date().toISOString());
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Produção - ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; font-size: 11px; }
           h1 { font-size: 13px; border-bottom: 2px solid #000; padding-bottom: 5px; }
           h2 { font-size: 11px; margin-top: 12px; color: #333; }
           .item { padding: 4px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
           .weight { font-weight: bold; font-size: 12px; }
           .protein { background: #f0f9ff; padding: 4px 6px; margin: 1px 0; }
           .side { padding: 4px 6px; margin: 1px 0; }
           .total { font-size: 11px; color: #666; margin-top: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🍳 LISTA DE PRODUÇÃO - COZINHA</h1>
        <p style="color: #666; font-size: 12px;">${today} • ${productionData.totals.marmitas} marmitas</p>
        
        <h2>🥩 PROTEÍNAS</h2>
        ${productionData.ingredients
          .filter(i => i.type === 'protein')
          .map(i => `
            <div class="item protein">
              <span>${i.name}</span>
              <span class="weight">${formatWeight(i.totalWeight)}</span>
            </div>
          `).join('')}
        
        <h2>🍚 CARBOIDRATOS</h2>
        ${productionData.ingredients
          .filter(i => i.type === 'carb')
          .map(i => `
            <div class="item side">
              <span>${i.name}</span>
              <span class="weight">${formatWeight(i.totalWeight)}</span>
            </div>
          `).join('')}
        
        <h2>🥗 SALADA</h2>
        ${productionData.ingredients
          .filter(i => i.type === 'salad')
          .map(i => `
            <div class="item side">
              <span>${i.name}</span>
              <span class="weight">${formatWeight(i.totalWeight)}</span>
            </div>
          `).join('')}
        
        ${productionData.juices.length > 0 ? `
          <h2>🥤 SUCOS (300ml/un)</h2>
          ${productionData.juices.map(j => `
            <div class="item">
              <span>${j.emoji} ${j.name}</span>
              <span class="weight">${formatJuiceDisplay(j.quantity)}</span>
            </div>
          `).join('')}
        ` : ''}
        
        ${productionData.soups.length > 0 ? `
          <h2>🥣 SOPAS (450ml/un)</h2>
          ${productionData.soups.map(s => `
            <div class="item">
              <span>${s.emoji} ${s.name}</span>
              <span class="weight">${formatSoupDisplay(s.quantity)}</span>
            </div>
          `).join('')}
        ` : ''}
        
        <div class="total">
          Total: ${productionData.totals.marmitas} marmitas + ${productionData.totals.juices} sucos + ${productionData.totals.soups} sopas
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Print assembly list
  const handlePrintAssembly = () => {
    const today = formatDateShort(new Date().toISOString());
    
    const fitCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fit');
    const fitnessCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fitness');
    const fitTotal = fitCombos.reduce((s, c) => s + c.quantity, 0);
    const fitnessTotal = fitnessCombos.reduce((s, c) => s + c.quantity, 0);
    
    const renderCombos = (combos: AssemblyCombination[]) => combos.map(combo => `
      <div class="combo">
        <div class="combo-header">
          <span class="combo-qty">${combo.quantity}x</span>
          <span>${combo.flavorName}</span>
        </div>
        <div class="combo-details">
          ${combo.ingredients.map(i => `${i.weight}g ${i.name}`).join(' + ')}
        </div>
        <div class="customers">
          👥 ${combo.customers.map(c => `${c.name} (${c.quantity})`).join(', ')}
        </div>
      </div>
    `).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Montagem - ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; font-size: 11px; }
           h1 { font-size: 13px; border-bottom: 2px solid #000; padding-bottom: 5px; }
           h2 { font-size: 11px; margin-top: 12px; padding: 4px 8px; border-radius: 6px; }
           .section-fit { background: #f0fdf4; border-left: 4px solid #22c55e; }
           .section-fitness { background: #eff6ff; border-left: 4px solid #3b82f6; }
           .combo { background: #f8f8f8; padding: 5px 8px; margin: 3px 0; border-radius: 8px; page-break-inside: avoid; }
           .combo-header { display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 2px; font-size: 11px; }
           .combo-qty { background: #22c55e; color: white; padding: 1px 6px; border-radius: 20px; font-size: 10px; min-width: 35px; text-align: center; }
           .combo-details { color: #666; font-size: 9px; }
           .customers { font-size: 8px; color: #999; margin-top: 3px; }
           .total { font-size: 11px; color: #666; margin-top: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>📦 LISTA DE MONTAGEM</h1>
        <p style="color: #666; font-size: 12px;">${today} • ${productionData.totals.marmitas} marmitas</p>
        
        ${fitCombos.length > 0 ? `
          <h2 class="section-fit">🥗 FIT 300g — ${fitTotal} marmitas</h2>
          ${renderCombos(fitCombos)}
        ` : ''}
        
        ${fitnessCombos.length > 0 ? `
          <h2 class="section-fitness">💪 FITNESS 450g — ${fitnessTotal} marmitas</h2>
          ${renderCombos(fitnessCombos)}
        ` : ''}
        
        <div class="total">
          Total: ${productionData.totals.marmitas} marmitas para montar
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Print both production + assembly on same page
  const handlePrintAll = () => {
    const today = formatDateShort(new Date().toISOString());
    
    const fitCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fit');
    const fitnessCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fitness');
    const fitTotal = fitCombos.reduce((s, c) => s + c.quantity, 0);
    const fitnessTotal = fitnessCombos.reduce((s, c) => s + c.quantity, 0);
    
    const renderCombos = (combos: AssemblyCombination[]) => combos.map(combo => `
      <div class="combo">
        <div class="combo-header">
          <span class="combo-qty">${combo.quantity}x</span>
          <span>${combo.flavorName}</span>
        </div>
        <div class="combo-details">
          ${combo.ingredients.map(i => `${i.weight}g ${i.name}`).join(' + ')}
        </div>
        <div class="customers">
          👥 ${combo.customers.map(c => `${c.name} (${c.quantity})`).join(', ')}
        </div>
      </div>
    `).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Produção Completa - ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 8px; font-size: 10px; }
           h1 { font-size: 12px; border-bottom: 2px solid #000; padding-bottom: 4px; }
           h2 { font-size: 10px; margin-top: 8px; color: #333; }
           .item { padding: 2px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
           .weight { font-weight: bold; font-size: 10px; }
           .protein { background: #f0f9ff; padding: 3px 6px; margin: 1px 0; }
           .side { padding: 3px 6px; margin: 1px 0; }
           .divider { border-top: 3px solid #000; margin: 10px 0; }
           .section-fit { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 3px 6px; border-radius: 6px; }
           .section-fitness { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 3px 6px; border-radius: 6px; }
           .combo { background: #f8f8f8; padding: 4px 6px; margin: 2px 0; border-radius: 8px; page-break-inside: avoid; }
           .combo-header { display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 2px; font-size: 10px; }
           .combo-qty { background: #22c55e; color: white; padding: 1px 6px; border-radius: 20px; font-size: 9px; min-width: 30px; text-align: center; }
           .combo-details { color: #666; font-size: 9px; }
           .customers { font-size: 8px; color: #999; margin-top: 2px; }
           .total { font-size: 9px; color: #666; margin-top: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🍳 LISTA DE PRODUÇÃO - COZINHA</h1>
        <p style="color: #666; font-size: 12px;">${today} • ${productionData.totals.marmitas} marmitas</p>
        
        <h2>🥩 PROTEÍNAS</h2>
        ${productionData.ingredients
          .filter(i => i.type === 'protein')
          .map(i => `<div class="item protein"><span>${i.name}</span><span class="weight">${formatWeight(i.totalWeight)}</span></div>`)
          .join('')}
        
        <h2>🍚 CARBOIDRATOS</h2>
        ${productionData.ingredients
          .filter(i => i.type === 'carb')
          .map(i => `<div class="item side"><span>${i.name}</span><span class="weight">${formatWeight(i.totalWeight)}</span></div>`)
          .join('')}
        
        <h2>🥗 SALADA</h2>
        ${productionData.ingredients
          .filter(i => i.type === 'salad')
          .map(i => `<div class="item side"><span>${i.name}</span><span class="weight">${formatWeight(i.totalWeight)}</span></div>`)
          .join('')}
        
        ${productionData.juices.length > 0 ? `
          <h2>🥤 SUCOS (300ml/un)</h2>
          ${productionData.juices.map(j => `<div class="item"><span>${j.emoji} ${j.name}</span><span class="weight">${formatJuiceDisplay(j.quantity)}</span></div>`).join('')}
        ` : ''}
        
        ${productionData.soups.length > 0 ? `
          <h2>🥣 SOPAS (450ml/un)</h2>
          ${productionData.soups.map(s => `<div class="item"><span>${s.emoji} ${s.name}</span><span class="weight">${formatSoupDisplay(s.quantity)}</span></div>`).join('')}
        ` : ''}
        
        <div class="divider"></div>
        
        <h1>📦 LISTA DE MONTAGEM</h1>
        <p style="color: #666; font-size: 12px;">${today} • ${productionData.totals.marmitas} marmitas</p>
        
        ${fitCombos.length > 0 ? `
          <h2 class="section-fit">🥗 FIT 300g — ${fitTotal} marmitas</h2>
          ${renderCombos(fitCombos)}
        ` : ''}
        
        ${fitnessCombos.length > 0 ? `
          <h2 class="section-fitness">💪 FITNESS 450g — ${fitnessTotal} marmitas</h2>
          ${renderCombos(fitnessCombos)}
        ` : ''}
        
        <div class="total">
          Total: ${productionData.totals.marmitas} marmitas + ${productionData.totals.juices} sucos + ${productionData.totals.soups} sopas
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Share production via WhatsApp
  const handleShareProduction = () => {
    const today = formatDateShort(new Date().toISOString());
    
    let text = `🍳 *LISTA DE PRODUÇÃO - COZINHA*\n`;
    text += `📅 ${today}\n\n`;
    
    // Proteins
    const proteins = productionData.ingredients.filter(i => i.type === 'protein');
    if (proteins.length > 0) {
      text += `*🥩 PROTEÍNAS*\n`;
      proteins.forEach(p => {
        text += `• ${p.name}: *${formatWeight(p.totalWeight)}*\n`;
      });
      text += `\n`;
    }
    
    // Carbs
    const carbs = productionData.ingredients.filter(i => i.type === 'carb');
    if (carbs.length > 0) {
      text += `*🍚 CARBOIDRATOS*\n`;
      carbs.forEach(s => {
        text += `• ${s.name}: *${formatWeight(s.totalWeight)}*\n`;
      });
      text += `\n`;
    }
    
    // Salads
    const salads = productionData.ingredients.filter(i => i.type === 'salad');
    if (salads.length > 0) {
      text += `*🥗 SALADA*\n`;
      salads.forEach(s => {
        text += `• ${s.name}: *${formatWeight(s.totalWeight)}*\n`;
      });
      text += `\n`;
    }
    
    // Juices
    if (productionData.juices.length > 0) {
      text += `*🥤 SUCOS (300ml/un)*\n`;
      productionData.juices.forEach(j => {
        text += `• ${j.emoji} ${j.name}: *${formatJuiceDisplay(j.quantity)}*\n`;
      });
      text += `\n`;
    }
    
    // Soups
    if (productionData.soups.length > 0) {
      text += `*🥣 SOPAS (450ml/un)*\n`;
      productionData.soups.forEach(s => {
        text += `• ${s.emoji} ${s.name}: *${formatSoupDisplay(s.quantity)}*\n`;
      });
      text += `\n`;
    }
    
    text += `📊 *TOTAL: ${productionData.totals.marmitas} marmitas + ${productionData.totals.juices} sucos + ${productionData.totals.soups} sopas*`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Share assembly via WhatsApp
  const handleShareAssembly = () => {
    const today = formatDateShort(new Date().toISOString());
    
    const fitCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fit');
    const fitnessCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fitness');
    const fitTotal = fitCombos.reduce((s, c) => s + c.quantity, 0);
    const fitnessTotal = fitnessCombos.reduce((s, c) => s + c.quantity, 0);
    
    let text = `📦 *LISTA DE MONTAGEM*\n`;
    text += `📅 ${today}\n\n`;
    
    if (fitCombos.length > 0) {
      text += `*🥗 FIT 300g — ${fitTotal} marmitas*\n\n`;
      fitCombos.forEach(combo => {
        text += `*${combo.quantity}x ${combo.flavorName}*\n`;
        text += `   ${combo.ingredients.map(i => `${i.weight}g ${i.name}`).join(' + ')}\n`;
        text += `   👥 ${combo.customers.map(c => `${c.name}(${c.quantity})`).join(', ')}\n\n`;
      });
    }
    
    if (fitnessCombos.length > 0) {
      text += `*💪 FITNESS 450g — ${fitnessTotal} marmitas*\n\n`;
      fitnessCombos.forEach(combo => {
        text += `*${combo.quantity}x ${combo.flavorName}*\n`;
        text += `   ${combo.ingredients.map(i => `${i.weight}g ${i.name}`).join(' + ')}\n`;
        text += `   👥 ${combo.customers.map(c => `${c.name}(${c.quantity})`).join(', ')}\n\n`;
      });
    }
    
    text += `📊 *TOTAL: ${productionData.totals.marmitas} marmitas*`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = productionData.totals.marmitas === 0 && 
                  productionData.totals.juices === 0 && 
                  productionData.totals.soups === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Produção do Dia</h2>
            <p className="text-sm text-muted-foreground">
              {filteredOrders.length} pedidos • {productionData.totals.marmitas + productionData.totals.juices + productionData.totals.soups} itens
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Em Produção</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="preparing">Preparando</SelectItem>
              <SelectItem value="ready">Prontos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Totals Bar */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{productionData.totals.marmitas}</div>
              <div className="text-sm text-muted-foreground">Marmitas</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-bold text-green-600">{productionData.totals.juices}</div>
              <div className="text-sm text-muted-foreground">Sucos</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{productionData.totals.soups}</div>
              <div className="text-sm text-muted-foreground">Sopas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-lg mb-2">Nenhum item para produção</h3>
            <p className="text-muted-foreground">
              Não há pedidos aprovados ou em preparação no período selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="production" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="production" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Produção (Cozinha)
              </TabsTrigger>
              <TabsTrigger value="assembly" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Montagem
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={handlePrintAll}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Tudo
            </Button>
          </div>

          {/* PRODUCTION TAB - Kitchen aggregated ingredients */}
          <TabsContent value="production" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handlePrintProduction}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleShareProduction}>
                <Share2 className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>

            {/* Proteins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🥩 Proteínas
                  <Badge variant="secondary">
                    {formatWeight(
                      productionData.ingredients
                        .filter(i => i.type === 'protein')
                        .reduce((sum, i) => sum + i.totalWeight, 0)
                    )}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productionData.ingredients
                    .filter(i => i.type === 'protein')
                    .map((ingredient, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <span className="font-medium">{ingredient.name}</span>
                        <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                          {formatWeight(ingredient.totalWeight)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Carbs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🍚 Carboidratos
                  <Badge variant="secondary">
                    {formatWeight(
                      productionData.ingredients
                        .filter(i => i.type === 'carb')
                        .reduce((sum, i) => sum + i.totalWeight, 0)
                    )}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productionData.ingredients
                    .filter(i => i.type === 'carb')
                    .map((ingredient, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <span className="font-medium">{ingredient.name}</span>
                        <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
                          {formatWeight(ingredient.totalWeight)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Salad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🥗 Salada
                  <Badge variant="secondary">
                    {formatWeight(
                      productionData.ingredients
                        .filter(i => i.type === 'salad')
                        .reduce((sum, i) => sum + i.totalWeight, 0)
                    )}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productionData.ingredients
                    .filter(i => i.type === 'salad')
                    .map((ingredient, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
                      >
                        <span className="font-medium">{ingredient.name}</span>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          {formatWeight(ingredient.totalWeight)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Juices */}
            {productionData.juices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🥤 Sucos Detox
                    <Badge variant="secondary">{productionData.totals.juices} un</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productionData.juices.map((juice, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg"
                      >
                        <span>{juice.emoji} {juice.name}</span>
                        <Badge variant="outline" className="text-lg font-bold">
                          {formatJuiceDisplay(juice.quantity)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Soups */}
            {productionData.soups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🥣 Sopas
                    <Badge variant="secondary">{productionData.totals.soups} un</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productionData.soups.map((soup, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg"
                      >
                        <span>{soup.emoji} {soup.name}</span>
                        <Badge variant="outline" className="text-lg font-bold">
                          {formatSoupDisplay(soup.quantity)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ASSEMBLY TAB - Individual marmita combinations */}
          <TabsContent value="assembly" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                const ordersForLabels = filteredOrders.map(o => ({
                  order_number: o.order_number,
                  customer_name: o.customer_name,
                  delivery_option: 'delivery',
                  items: o.items,
                }));
                generateLabelsA7(ordersForLabels);
                toast({ title: "Etiquetas geradas!" });
              }}>
                <Tag className="w-4 h-4 mr-2" />
                Etiquetas A7
              </Button>
              <Button variant="outline" onClick={handlePrintAssembly}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handleShareAssembly}>
                <Share2 className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>

            {(() => {
              const fitCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fit');
              const fitnessCombos = productionData.assemblyCombinations.filter(c => c.lineType === 'fitness');
              const fitTotal = fitCombos.reduce((s, c) => s + c.quantity, 0);
              const fitnessTotal = fitnessCombos.reduce((s, c) => s + c.quantity, 0);
              
              const renderComboCard = (combo: AssemblyCombination, idx: number, borderColor: string) => (
                <div 
                  key={idx} 
                  className={`p-4 bg-muted/50 rounded-lg border-l-4 ${borderColor}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="text-base px-4 py-1 shrink-0">
                      {combo.quantity}x
                    </Badge>
                    <h4 className="font-bold text-lg">{combo.flavorName}</h4>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-3 font-mono bg-background/50 p-2 rounded">
                    {combo.ingredients.map(i => `${i.weight}g ${i.name}`).join(' + ')}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    👥 {combo.customers.map(c => `${c.name} (${c.quantity})`).join(', ')}
                  </div>
                </div>
              );

              return (
                <>
                  {fitCombos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          🥗 FIT 300g
                          <Badge variant="secondary">{fitTotal} marmitas</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {fitCombos.map((combo, idx) => renderComboCard(combo, idx, 'border-primary'))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {fitnessCombos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          💪 FITNESS 450g
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{fitnessTotal} marmitas</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {fitnessCombos.map((combo, idx) => renderComboCard(combo, idx, 'border-blue-500'))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ProductionPanel;
