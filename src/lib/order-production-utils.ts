import type { Json } from "@/integrations/supabase/types";
import { getFlavorSidesForLine, generateDefaultSides, enforceEscondidinhoComposition, FlavorSideItem } from "@/lib/flavor-description";
import { normalizeVeggieName } from "@/lib/ingredient-normalization";

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
  lineType?: string;
  flavors?: FlavorItem[];
}

interface OrderForProduction {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
}

interface ProductionLine {
  flavorName: string;
  quantity: number;
  line: string; // 'FIT 300g' or 'FITNESS 450g'
  lineKey: 'fit' | 'fitness';
  sides: FlavorSideItem[];
}

const stopWords = new Set(['com', 'de', 'e', 'em', 'ao', 'a', 'o', 'mix', 'da', 'do']);

const extractWords = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[\s,]+/).filter(w => w.length > 1 && !stopWords.has(w));

const findFlavorSides = (
  flavorName: string,
  lineKey: 'fit' | 'fitness',
  flavorSidesMap: Record<string, Json | null>
): FlavorSideItem[] => {
  // Try exact match
  let sidesData = flavorSidesMap[flavorName] ?? null;

  // Try fuzzy match
  if (!sidesData) {
    const targetWords = extractWords(flavorName);
    let bestMatch = '';
    let bestScore = 0;
    for (const key of Object.keys(flavorSidesMap)) {
      const keyWords = extractWords(key);
      const overlap = targetWords.filter(w => keyWords.includes(w)).length;
      const score = overlap / Math.max(targetWords.length, keyWords.length);
      // Penalize cross-type matches: escondidinho ↔ non-escondidinho
      const targetIsEsc = targetWords.some(w => w.startsWith('escondidinho') || w.startsWith('esondidinho'));
      const keyIsEsc = keyWords.some(w => w.startsWith('escondidinho') || w.startsWith('esondidinho'));
      if (targetIsEsc !== keyIsEsc) continue;
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = key;
      }
    }
    if (bestMatch) sidesData = flavorSidesMap[bestMatch];
  }

  // Get sides for the specific line
  const items = sidesData ? getFlavorSidesForLine(sidesData, lineKey) : null;
  if (items && items.length > 0) return items;

  // Fallback: generate default
  return generateDefaultSides(flavorName, lineKey);
};

/**
 * Enriches generic ingredient names (e.g. "Frango") with context from
 * the flavor name (e.g. "Frango à parmegiana", "Frango desfiado").
 * This ensures production totals never lump different preparations together.
 */
const enrichSideName = (sideName: string, flavorName: string): string => {
  const lowerSide = sideName.toLowerCase().trim();
  const lowerFlavor = flavorName.toLowerCase();

  const isGenericFrango = lowerSide === 'frango';
  const isGenericCarne = lowerSide === 'carne';

  if (!isGenericFrango && !isGenericCarne) return sideName;

  // Parmegiana → keep full preparation name
  if (lowerFlavor.includes('parmegiana') || lowerFlavor.includes('parmigiana')) {
    return isGenericFrango ? 'Frango à parmegiana' : 'Carne à parmegiana';
  }

  // Pasta dishes → shredded protein
  if (lowerFlavor.includes('macarronada') || lowerFlavor.includes('macarrão')) {
    return isGenericFrango ? 'Frango desfiado' : 'Carne desfiada';
  }

  // Almôndega
  if (lowerFlavor.includes('almôndega') || lowerFlavor.includes('almondega')) {
    return isGenericCarne ? 'Almôndega' : sideName;
  }

  return sideName;
};

export const getOrderProductionLines = (
  order: OrderForProduction,
  flavorSidesMap: Record<string, Json | null>
): ProductionLine[] => {
  const lines: ProductionLine[] = [];

  for (const item of order.items) {
    if (item.type !== 'marmita' || !item.flavors) continue;

    const lineKey: 'fit' | 'fitness' =
      item.lineType === 'hipertrofia' || item.lineType === 'fitness'
      || /hipertrofia|fitness/i.test(item.name)
        ? 'fitness' : 'fit';
    const lineLabel = lineKey === 'fitness' ? 'FITNESS 450g' : 'FIT 300g';

    for (const flavor of item.flavors) {
      const sides = findFlavorSides(flavor.name, lineKey, flavorSidesMap);
      // Enrich generic names based on dish context
      const enrichedSides = sides.map(s => ({
        ...s,
        name: enrichSideName(s.name, flavor.name),
      }));
      lines.push({
        flavorName: flavor.name,
        quantity: flavor.quantity,
        line: lineLabel,
        lineKey,
        sides: enrichedSides,
      });
    }
  }

  return lines;
};

// Classify ingredient for grouping
const classifyIngredient = (name: string): 'protein' | 'carb' | 'salad' => {
  const lower = name.toLowerCase();
  const carbKeywords = ['arroz', 'aipim', 'batata', 'purê', 'pure', 'feijão', 'feijao', 'macarrão', 'macarrao', 'nhoque', 'mandioca', 'farinha', 'risoto', 'molho'];
  if (carbKeywords.some(k => lower.includes(k))) return 'carb';
  const saladKeywords = ['mix', 'salada', 'legume', 'brócolis', 'brocolis', 'chuchu', 'cenoura', 'abobrinha', 'vagem'];
  if (saladKeywords.some(k => lower.includes(k))) return 'salad';
  return 'protein';
};

export const generateOrderProductionHTML = (
  order: OrderForProduction,
  productionLines: ProductionLine[]
): string => {
  // Aggregate ingredients
  const ingredientTotals: Record<string, { weight: number; type: string }> = {};
  for (const line of productionLines) {
    for (const side of line.sides) {
      const key = classifyIngredient(side.name) === 'salad' ? normalizeVeggieName(side.name) : side.name;
      const totalW = side.weight * line.quantity;
      if (ingredientTotals[key]) {
        ingredientTotals[key].weight += totalW;
      } else {
        ingredientTotals[key] = { weight: totalW, type: classifyIngredient(side.name) };
      }
    }
  }

  const grouped = { protein: [] as string[], carb: [] as string[], salad: [] as string[] };
  for (const [name, { weight, type }] of Object.entries(ingredientTotals)) {
    grouped[type].push(`<div style="padding:2px 0;">⚖️ <strong>${name}:</strong> ${weight}g</div>`);
  }

  const detailHtml = productionLines.map(l => {
    const sidesText = l.sides.map(s => `${s.weight}g ${s.name}`).join(' + ');
    return `<div style="padding:3px 0;border-bottom:1px dotted #ddd;">
      <strong>${l.quantity}x ${l.flavorName}</strong>
      <span style="color:#888;font-size:10px;margin-left:6px;">${l.line}</span>
      <div style="font-size:10px;color:#666;margin-left:12px;">${sidesText}</div>
    </div>`;
  }).join('');

  const sectionHtml = (emoji: string, title: string, items: string[]) =>
    items.length > 0 ? `
      <div style="margin-top:8px;">
        <div style="background:#333;color:#fff;padding:3px 8px;font-size:11px;font-weight:bold;border-radius:3px;">
          ${emoji} ${title}
        </div>
        ${items.join('')}
      </div>` : '';

  const totalMarmitas = productionLines.reduce((s, l) => s + l.quantity, 0);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Produção - Pedido #${order.order_number || order.id.slice(0, 8)}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;padding:12px;max-width:400px;margin:0 auto;font-size:11px;}
      .header{text-align:center;border-bottom:2px dashed #333;padding-bottom:8px;margin-bottom:10px;}
      .header h1{font-size:14px;}
      .header h2{font-size:11px;color:#666;margin-top:3px;}
      @media print{body{padding:8px;}}
    </style></head><body>
    <div class="header">
      <h1>👨‍🍳 FICHA DE PRODUÇÃO</h1>
      <h2>Pedido #${order.order_number || order.id.slice(0, 8)} — ${order.customer_name}</h2>
      <div style="font-size:10px;color:#888;margin-top:2px;">Total: ${totalMarmitas} marmita${totalMarmitas > 1 ? 's' : ''}</div>
    </div>

    <div style="margin-bottom:10px;">
      <div style="font-weight:bold;font-size:12px;margin-bottom:5px;">📦 Detalhes por sabor:</div>
      ${detailHtml}
    </div>

    ${sectionHtml('🥩', 'PROTEÍNAS', grouped.protein)}
    ${sectionHtml('🍚', 'CARBOIDRATOS', grouped.carb)}
    ${sectionHtml('🥗', 'SALADA / LEGUMES', grouped.salad)}

    </body></html>`;
};

export const printOrderProduction = (
  order: OrderForProduction,
  flavorSidesMap: Record<string, Json | null>
): void => {
  const lines = getOrderProductionLines(order, flavorSidesMap);
  if (lines.length === 0) {
    alert('Este pedido não possui marmitas para produção.');
    return;
  }
  const html = generateOrderProductionHTML(order, lines);
  const w = window.open('', '_blank', 'width=450,height=600');
  if (!w) { alert('Habilite pop-ups para imprimir.'); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
};

export const generateOrderProductionWhatsApp = (
  order: OrderForProduction,
  flavorSidesMap: Record<string, Json | null>
): string => {
  const lines = getOrderProductionLines(order, flavorSidesMap);
  if (lines.length === 0) return '';

  const totalMarmitas = lines.reduce((s, l) => s + l.quantity, 0);
  const parts: string[] = [];
  parts.push(`👨‍🍳 *PRODUÇÃO - Pedido #${order.order_number || order.id.slice(0, 8)}*`);
  parts.push(`👤 ${order.customer_name} | ${totalMarmitas} marmita${totalMarmitas > 1 ? 's' : ''}`);
  parts.push('');

  for (const l of lines) {
    const sidesText = l.sides.map(s => `${s.weight}g ${s.name}`).join(' + ');
    parts.push(`• ${l.quantity}x ${l.flavorName} (${l.line})`);
    parts.push(`  ${sidesText}`);
  }

  // Aggregate totals
  const totals: Record<string, number> = {};
  for (const l of lines) {
    for (const s of l.sides) {
      totals[s.name] = (totals[s.name] || 0) + s.weight * l.quantity;
    }
  }
  parts.push('');
  parts.push('*⚖️ TOTAL INGREDIENTES:*');
  for (const [name, weight] of Object.entries(totals)) {
    parts.push(`  ${name}: ${weight}g`);
  }

  return parts.join('\n');
};
