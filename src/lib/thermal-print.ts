// Thermal printer (i9 80mm) optimized print utilities for kitchen use

import type { Json } from "@/integrations/supabase/types";
import { getFlavorSidesForLine, generateDefaultSides, FlavorSideItem } from "@/lib/flavor-description";

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
      if (score > bestScore && score >= 0.5) { bestScore = score; bestMatch = key; }
    }
    if (bestMatch) sidesData = flavorSidesMap[bestMatch];
  }
  const items = sidesData ? getFlavorSidesForLine(sidesData, lineKey) : null;
  if (items && items.length > 0) return items;
  return generateDefaultSides(flavorName, lineKey);
};

const enrichSideName = (sideName: string, flavorName: string): string => {
  const lowerSide = sideName.toLowerCase().trim();
  const lowerFlavor = flavorName.toLowerCase();
  const isGenericFrango = lowerSide === 'frango';
  const isGenericCarne = lowerSide === 'carne';
  if (!isGenericFrango && !isGenericCarne) return sideName;
  if (lowerFlavor.includes('parmegiana') || lowerFlavor.includes('parmigiana'))
    return isGenericFrango ? 'Frango à parmegiana' : 'Carne à parmegiana';
  if (lowerFlavor.includes('macarronada') || lowerFlavor.includes('macarrão'))
    return isGenericFrango ? 'Frango desfiado' : 'Carne desfiada';
  if (lowerFlavor.includes('almôndega') || lowerFlavor.includes('almondega'))
    return isGenericCarne ? 'Almôndega' : sideName;
  return sideName;
};

export const generateThermalTicketHTML = (
  order: ThermalOrder,
  flavorSidesMap: Record<string, Json | null> = {},
  brandName = 'DIETA JÁ'
): string => {
  const orderNum = order.order_number || order.id.slice(0, 8);
  const marmitas = order.items.filter(i => i.type === 'marmita');
  const outros = order.items.filter(i => i.type !== 'marmita');

  let totalMarmitas = 0;
  const ingredientTotals: Record<string, number> = {};

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
      const sides = findFlavorSides(f.name, lineKey, flavorSidesMap);
      const enrichedSides = sides.map(s => ({ ...s, name: enrichSideName(s.name, f.name) }));

      for (const s of enrichedSides) {
        const totalW = s.weight * f.quantity;
        ingredientTotals[s.name] = (ingredientTotals[s.name] || 0) + totalW;
      }

      const sidesText = enrichedSides.map(s =>
        `<div style="font-size:11px;color:#444;margin-left:12px;">⚖️ ${s.weight}g ${s.name}</div>`
      ).join('');

      groupMap[lineKey].rows.push(`<div style="padding:3px 0;border-bottom:1px dashed #ddd;">
        <div style="font-size:14px;font-weight:bold;">${f.quantity}x ${f.name}</div>
        ${sidesText}
      </div>`);
    }
  }

  // Render grouped marmitas
  const marmitaGroupsHtml = Object.values(groupMap).map(g => `
    <div style="background:#444;color:#fff;padding:2px 6px;font-size:12px;font-weight:bold;margin-top:4px;">
      ${g.lineLabel}
    </div>
    ${g.rows.join('')}
  `).join('');

  const outrosRows = outros.map(item =>
    `<tr><td style="padding:3px 0;font-size:14px;font-weight:bold;">${item.quantity}x ${item.name}</td></tr>`
  ).join('');

  const deliveryText = order.delivery_option === 'delivery'
    ? `🚚 DELIVERY<br><span style="font-size:13px;">${order.delivery_address || 'Não informado'}</span>`
    : `🏪 RETIRADA`;

  const discountLine = order.discount_amount && order.discount_amount > 0
    ? `<div style="font-size:13px;">Desconto${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${fmtMoney(order.discount_amount)}</div>`
    : '';

  // Build ingredient totals footer
  const hasIngredients = Object.keys(ingredientTotals).length > 0;
  const ingredientLines = Object.entries(ingredientTotals)
    .map(([name, weight]) => `<div style="padding:1px 0;">• ${weight}g ${name}</div>`)
    .join('');

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
  <div style="background:#000;color:#fff;padding:4px 6px;font-size:14px;font-weight:bold;text-align:center;letter-spacing:1px;">
    🍱 MARMITAS (${totalMarmitas})
  </div>
  ${marmitaGroupsHtml}
</div>
` : ''}

<!-- OUTROS ITENS -->
${outros.length > 0 ? `
<div style="margin-top:4px;">
  <div style="background:#000;color:#fff;padding:4px 6px;font-size:14px;font-weight:bold;text-align:center;">
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
  <div style="background:#000;color:#fff;padding:4px 6px;font-size:12px;font-weight:bold;text-align:center;letter-spacing:1px;">
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
  brandName = 'DIETA JÁ'
): void => {
  const html = generateThermalTicketHTML(order, flavorSidesMap, brandName);
  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) {
    alert('Habilite pop-ups para imprimir.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
};
