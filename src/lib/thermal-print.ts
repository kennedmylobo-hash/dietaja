// Thermal printer (i9 80mm) optimized print utilities for kitchen use

import type { Json } from "@/integrations/supabase/types";
import { getFlavorSidesForLine, generateDefaultSides, FlavorSideItem } from "@/lib/flavor-description";
import { normalizeVeggieName, normalizeProteinName, classifyIngredientName } from "@/lib/ingredient-normalization";

interface FlavorDetail {
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
  flavors?: FlavorDetail[];
}

interface ThermalOrder {
  id: string;
  order_number: string | null;
  status: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  discount_amount?: number | null;
  coupon_code?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_option: string;
  delivery_address: string | null;
  created_at: string;
  paid_at?: string | null;
}

const fmtPhone = (phone: string): string => {
  const c = phone.replace(/\D/g, '');
  if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
  if (c.length === 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`;
  return phone;
};

const fmtMoney = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (d: string): string =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// --- Sides resolution (same logic as order-production-utils) ---
const stopWords = new Set(['com', 'de', 'e', 'em', 'ao', 'a', 'o', 'mix', 'da', 'do']);
const extractWords = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[\s,]+/).filter(w => w.length > 1 && !stopWords.has(w));

const findFlavorSides = (
  flavorName: string,
  lineKey: 'fit' | 'fitness',
  flavorSidesMap: Record<string, Json | null>
): FlavorSideItem[] => {
  let sidesData = flavorSidesMap[flavorName] ?? null;
  if (!sidesData) {
    const targetWords = extractWords(flavorName);
    let bestMatch = '';
    let bestScore = 0;
    for (const key of Object.keys(flavorSidesMap)) {
      const keyWords = extractWords(key);
      const overlap = targetWords.filter(w => keyWords.includes(w)).length;
      const score = overlap / Math.max(targetWords.length, keyWords.length);
      if (score > bestScore && score >= 0.3) { bestScore = score; bestMatch = key; }
    }
    if (bestMatch) sidesData = flavorSidesMap[bestMatch];
  }
  const items = sidesData ? getFlavorSidesForLine(sidesData, lineKey) : null;
  if (items && items.length > 0) return items;
  return generateDefaultSides(flavorName, lineKey);
};

const normalizeText = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const inferPureByFlavor = (normalizedFlavor: string): string => {
  if (normalizedFlavor.includes('abobora') || normalizedFlavor.includes('abobrinha')) return 'Purê de abóbora';
  if (/batata[\s-]*doce/.test(normalizedFlavor)) return 'Purê de batata doce';
  if (/(aipim|aipjm|mandioca|macaxeira)/.test(normalizedFlavor)) return 'Purê de aipim';
  return 'Purê de aipim';
};

const enrichSideNameForKitchen = (sideName: string, flavorName: string): string => {
  const normalizedSide = normalizeText(sideName);
  const normalizedFlavor = normalizeText(flavorName);
  const sideType = classifyIngredientName(sideName);
  const isProtein = sideType === 'protein';
  const isCarb = sideType === 'carb';
  const isGenericFrango = normalizedSide === 'frango';
  const isGenericCarne = normalizedSide === 'carne' || normalizedSide === 'carne bovina';
  const isEscondidinho = /escondidinho|esondidinho/.test(normalizedFlavor);

  // Regra de negócio: todo escondidinho sempre usa purê e proteína específica
  if (isEscondidinho) {
    if (isProtein) {
      if (normalizedFlavor.includes('frango')) return 'Frango desfiado';
      if (normalizedFlavor.includes('carne')) return normalizedFlavor.includes('desfiad') ? 'Carne desfiada' : 'Carne moída';
    }
    if (isCarb) {
      return inferPureByFlavor(normalizedFlavor);
    }
  }

  // Purês: corrige carbos genéricos/inconsistentes conforme sabor
  if (isCarb) {
    const hasPureContext = normalizedFlavor.includes('pure');
    const isGenericOrAmbiguousCarb = ['graos', 'grao', 'pure', 'pure de aipim'].includes(normalizedSide);

    if (hasPureContext || isGenericOrAmbiguousCarb) {
      if (normalizedFlavor.includes('abobora') || normalizedFlavor.includes('abobrinha')) return 'Purê de abóbora';
      if (/batata[\s-]*doce/.test(normalizedFlavor)) return 'Purê de batata doce';
      if (/(aipim|aipjm|mandioca|macaxeira)/.test(normalizedFlavor)) return 'Purê de aipim';
    }
  }

  if (!isGenericFrango && !isGenericCarne) return sideName;

  if (normalizedFlavor.includes('parmegiana') || normalizedFlavor.includes('parmigiana'))
    return isGenericFrango ? 'Frango à parmegiana' : 'Carne à parmegiana';
  if (normalizedFlavor.includes('macarronada') || normalizedFlavor.includes('macarrao'))
    return isGenericFrango ? 'Frango desfiado' : 'Carne desfiada';
  if (/(almondega|almondega|almodenga)/.test(normalizedFlavor))
    return isGenericCarne ? 'Almôndega' : sideName;
  if (normalizedFlavor.includes('em cubos'))
    return isGenericFrango ? 'Frango em cubos' : 'Carne em cubos';
  if (normalizedFlavor.includes('moida'))
    return isGenericCarne ? 'Carne moída' : sideName;
  if (normalizedFlavor.includes('desfiad'))
    return isGenericFrango ? 'Frango desfiado' : 'Carne desfiada';
  if (normalizedFlavor.includes('grelhad') || normalizedFlavor.includes('grlhad'))
    return isGenericFrango ? 'Frango grelhado' : 'Carne grelhada';
  if (normalizedFlavor.includes('strogonoff') || normalizedFlavor.includes('estrogonofe'))
    return isGenericFrango ? 'Frango (estrogonofe)' : 'Carne (estrogonofe)';

  return sideName;
};

export const generateThermalTicketHTML = (
  order: ThermalOrder,
  flavorSidesMap: Record<string, Json | null> = {},
  ingredientDescMap: Record<string, string> = {},
  brandName = 'DIETA JÁ'
): string => {
  const orderNum = order.order_number || order.id.slice(0, 8);
  const marmitas = order.items.filter(i => i.type === 'marmita');
  const outros = order.items.filter(i => i.type !== 'marmita');

  let totalMarmitas = 0;
  const ingredientTotals: Record<string, { weight: number; type: 'protein' | 'carb' | 'salad' }> = {};

  // Group marmitas by line type (fit/fitness)
  interface MarmitaGroup { lineKey: 'fit' | 'fitness'; lineLabel: string; rows: string[]; }
  const groupMap: Record<string, MarmitaGroup> = {};

  for (const item of marmitas) {
    const lineKey: 'fit' | 'fitness' =
      (item.lineType === 'hipertrofia' || item.lineType === 'fitness' || /hipertrofia|fitness/i.test(item.name))
        ? 'fitness' : 'fit';
    const lineLabel = lineKey === 'fitness' ? 'FITNESS 450g' : 'FIT 300g';

    if (!groupMap[lineKey]) groupMap[lineKey] = { lineKey, lineLabel, rows: [] };

    if (!item.flavors?.length) {
      totalMarmitas += item.quantity;
      groupMap[lineKey].rows.push(`<div style="padding:3px 0;border-bottom:1px dashed #ddd;font-size:14px;font-weight:bold;">
        ${item.quantity}x ${item.name}
      </div>`);
      continue;
    }

    for (const f of item.flavors) {
      totalMarmitas += f.quantity;

      // Detect custom diet items: flavor name contains weight specs like "150g carne"
      // Also check item.name as fallback since some importers store the full description there
      const dietSource = f.name || '';
      const isCustomDiet = /\d+\s*g\s+/i.test(dietSource);

      if (isCustomDiet) {
        // Custom diet: ingredients are already in the name, parse them for totals
        // Split by "+" and strip leading "com " prefix
        const rawParts = dietSource.split(/\+/).map(p => p.trim().replace(/^com\s+/i, ''));
        for (const part of rawParts) {
          const wMatch = part.match(/(\d+)\s*g\s+(.+)/i);
          if (wMatch) {
            const rawIngName = wMatch[2].trim();
            const ingType = classifyIngredientName(rawIngName);
            const ingName = ingType === 'protein' ? normalizeProteinName(rawIngName)
              : ingType === 'salad' ? normalizeVeggieName(rawIngName)
              : rawIngName.charAt(0).toUpperCase() + rawIngName.slice(1);
            const ingWeight = parseInt(wMatch[1]);
            const existing = ingredientTotals[ingName];
            if (existing) {
              existing.weight += ingWeight * f.quantity;
            } else {
              ingredientTotals[ingName] = { weight: ingWeight * f.quantity, type: ingType };
            }
          }
        }

        // Display exactly as sent (strip leading "com ")
        const displayParts = rawParts.filter(p => /\d+\s*g\s+/i.test(p));
        groupMap[lineKey].rows.push(`<div style="padding:3px 0;border-bottom:1px dashed #ddd;">
          <div style="font-size:14px;font-weight:bold;">${f.quantity}x Dieta personalizada</div>
          ${displayParts.map(p => `<div style="font-size:12px;color:#222;margin-left:12px;">⚖️ ${p}</div>`).join('')}
        </div>`);
      } else {
        // Standard marmita: resolve sides from flavor map
        const sides = findFlavorSides(f.name, lineKey, flavorSidesMap);
        const kitchenSides = sides.map(s => ({ ...s, name: enrichSideNameForKitchen(s.name, f.name) }));

        for (const s of kitchenSides) {
          const totalW = s.weight * f.quantity;
          const normName = classifyIngredientName(s.name) === 'salad' ? normalizeVeggieName(s.name) : s.name;
          const existing = ingredientTotals[normName];
          if (existing) {
            existing.weight += totalW;
          } else {
            ingredientTotals[normName] = { weight: totalW, type: classifyIngredientName(s.name) };
          }
        }

        const sidesText = kitchenSides.map(s =>
          `<div style="font-size:12px;color:#222;margin-left:12px;">⚖️ ${s.weight}g ${s.name}</div>`
        ).join('');

        groupMap[lineKey].rows.push(`<div style="padding:3px 0;border-bottom:1px dashed #ddd;">
          <div style="font-size:14px;font-weight:bold;">${f.quantity}x ${f.name}</div>
          ${sidesText}
        </div>`);
      }
    }
  }

  // Render grouped marmitas
  const marmitaGroupsHtml = Object.values(groupMap).map(g => {
    const groupQty = g.rows.length; // approximate; real count below
    return `
    <div style="border-top:2px solid #000;border-bottom:1px solid #000;padding:3px 0;margin-top:6px;text-align:center;">
      <div style="font-size:16px;font-weight:bold;letter-spacing:1px;">📦 ${g.lineLabel}</div>
    </div>
    ${g.rows.join('')}
  `;
  }).join('');

  const outrosRows = outros.map(item => {
    // Show kit flavors (juices/soups) with ingredients
    if (item.flavors && item.flavors.length > 0) {
      const flavorLines = item.flavors.map(f => {
        const desc = ingredientDescMap[f.name];
        return `<div style="padding:2px 0;font-size:13px;margin-left:8px;">
          • ${f.quantity}x ${f.name}${desc ? `<br><span style="font-size:11px;color:#555;margin-left:16px;">↳ ${desc}</span>` : ''}
        </div>`;
      }).join('');
      return `<tr><td style="padding:3px 0;">
        <div style="font-size:14px;font-weight:bold;">${item.quantity}x ${item.name}</div>
        ${flavorLines}
      </td></tr>`;
    }
    return `<tr><td style="padding:3px 0;font-size:14px;font-weight:bold;">${item.quantity}x ${item.name}</td></tr>`;
  }).join('');

  const deliveryText = order.delivery_option === 'delivery'
    ? `🚚 DELIVERY<br><span style="font-size:13px;">${order.delivery_address || 'Não informado'}</span>`
    : `🏪 RETIRADA`;

  const discountLine = order.discount_amount && order.discount_amount > 0
    ? `<div style="font-size:13px;">Desconto${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${fmtMoney(order.discount_amount)}</div>`
    : '';

  // Build ingredient totals footer grouped by category
  const hasIngredients = Object.keys(ingredientTotals).length > 0;
  const groupedTotals: Record<'protein' | 'carb' | 'salad', { name: string; weight: number }[]> = {
    protein: [], carb: [], salad: [],
  };
  for (const [name, { weight, type }] of Object.entries(ingredientTotals)) {
    groupedTotals[type].push({ name, weight });
  }
  // Sort each group by weight desc
  for (const arr of Object.values(groupedTotals)) arr.sort((a, b) => b.weight - a.weight);

  const renderGroup = (emoji: string, title: string, items: { name: string; weight: number }[]) =>
    items.length > 0
      ? `<div style="margin-top:3px;font-size:11px;font-weight:bold;text-decoration:underline;">${emoji} ${title}</div>` +
        items.map(i => `<div style="padding:1px 0;font-size:12px;">• ${i.weight}g ${i.name}</div>`).join('')
      : '';

  const ingredientLines = renderGroup('🥩', 'PROTEÍNAS', groupedTotals.protein)
    + renderGroup('🍚', 'CARBOIDRATOS', groupedTotals.carb)
    + renderGroup('🥗', 'LEGUMES', groupedTotals.salad);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Pedido ${orderNum}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', monospace;
    width: 80mm;
    padding: 6mm 4mm;
    font-size: 13px;
    font-weight: bold;
    line-height: 1.3;
    color: #000;
  }
  .divider { border-top: 2px dashed #000; margin: 6px 0; }
  .divider-light { border-top: 1px dashed #999; margin: 4px 0; }
  .center { text-align: center; }
  .big { font-size: 22px; font-weight: bold; }
  .med { font-size: 16px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  .check-row { display: flex; gap: 10px; justify-content: center; margin-top: 6px; }
  .check-item { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: bold; }
  .check-box { width: 16px; height: 16px; border: 2px solid #000; display: inline-block; }
  @media print { body { width: 80mm; padding: 2mm 3mm; } }
</style>
</head><body>

<!-- HEADER -->
<div class="center">
  <div style="font-size:18px;font-weight:bold;letter-spacing:2px;">${brandName.toUpperCase()}</div>
  <div class="divider"></div>
  <div class="big">#${orderNum}</div>
  <div style="font-size:12px;color:#555;">${fmtDate(order.created_at)}</div>
</div>

<div class="divider"></div>

<!-- CLIENTE -->
<div>
  <div class="med">👤 ${order.customer_name}</div>
  <div style="font-size:12px;">📱 ${fmtPhone(order.customer_phone)}</div>
</div>

<div class="divider-light"></div>

<!-- ENTREGA -->
<div class="med">${deliveryText}</div>

<div class="divider"></div>

<!-- ITENS - MARMITAS -->
${marmitas.length > 0 ? `
<div style="margin-bottom:4px;">
  <div style="border:2px solid #000;padding:4px 6px;text-align:center;">
    <div style="font-size:18px;font-weight:bold;letter-spacing:1px;">🍱 MARMITAS</div>
    <div style="font-size:16px;font-weight:bold;">TOTAL: ${totalMarmitas} unidades</div>
  </div>
  ${marmitaGroupsHtml}
</div>
` : ''}

<!-- OUTROS ITENS -->
${outros.length > 0 ? `
<div style="margin-top:4px;">
  <div style="border:2px solid #000;padding:4px 6px;text-align:center;font-size:14px;font-weight:bold;">
    📦 OUTROS
  </div>
  <table style="margin-top:4px;">
    ${outrosRows}
  </table>
</div>
` : ''}


${hasIngredients ? `
<div class="divider"></div>
<!-- TOTAL INGREDIENTES -->
<div>
  <div style="border:2px solid #000;padding:4px 6px;text-align:center;font-size:12px;font-weight:bold;letter-spacing:1px;">
    ⚖️ TOTAL INGREDIENTES
  </div>
  <div style="margin-top:4px;font-size:12px;">
    ${ingredientLines}
  </div>
</div>
` : ''}

<div class="divider"></div>

<!-- CHECKLIST COZINHA -->
<div class="check-row">
  <div class="check-item"><span class="check-box"></span> SEP</div>
  <div class="check-item"><span class="check-box"></span> CONF</div>
  <div class="check-item"><span class="check-box"></span> OK</div>
</div>

<div style="text-align:center;margin-top:8px;font-size:10px;color:#888;">
  — ${brandName} —
</div>

</body></html>`;
};

export const printThermalTicket = (
  order: ThermalOrder,
  flavorSidesMap: Record<string, Json | null> = {},
  brandName = 'DIETA JÁ',
  ingredientDescMap: Record<string, string> = {}
): void => {
  const html = generateThermalTicketHTML(order, flavorSidesMap, ingredientDescMap, brandName);
  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) {
    alert('Habilite pop-ups para imprimir.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
};
