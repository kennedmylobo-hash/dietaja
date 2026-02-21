// Thermal printer (i9 80mm) optimized print utilities for kitchen use

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

export const generateThermalTicketHTML = (order: ThermalOrder, brandName = 'DIETA JÁ'): string => {
  const orderNum = order.order_number || order.id.slice(0, 8);

  // Build items — grouped by type for kitchen clarity
  const marmitas = order.items.filter(i => i.type === 'marmita');
  const outros = order.items.filter(i => i.type !== 'marmita');

  let totalMarmitas = 0;

  const marmitaRows = marmitas.map(item => {
    const lineLabel = (item.lineType === 'hipertrofia' || item.lineType === 'fitness' || /hipertrofia|fitness/i.test(item.name))
      ? 'FITNESS 450g' : 'FIT 300g';

    if (!item.flavors?.length) {
      totalMarmitas += item.quantity;
      return `<tr><td colspan="2" style="padding:4px 0;border-bottom:1px dashed #ccc;font-size:16px;font-weight:bold;">
        ${item.quantity}x ${item.name} <span style="font-size:11px;color:#888;">${lineLabel}</span>
      </td></tr>`;
    }

    const flavorLines = item.flavors.map(f => {
      totalMarmitas += f.quantity;
      return `<tr>
        <td style="padding:2px 0 2px 8px;font-size:15px;font-weight:bold;">${f.quantity}x ${f.name}</td>
        <td style="text-align:right;font-size:11px;color:#888;white-space:nowrap;">${lineLabel}</td>
      </tr>`;
    }).join('');

    return flavorLines;
  }).join('');

  const outrosRows = outros.map(item =>
    `<tr><td style="padding:3px 0;font-size:14px;font-weight:bold;">${item.quantity}x ${item.name}</td>
     <td style="text-align:right;font-size:13px;">${fmtMoney(item.totalPrice)}</td></tr>`
  ).join('');

  const deliveryText = order.delivery_option === 'delivery'
    ? `🚚 DELIVERY<br><span style="font-size:13px;">${order.delivery_address || 'Não informado'}</span>`
    : `🏪 RETIRADA`;

  const discountLine = order.discount_amount && order.discount_amount > 0
    ? `<div style="font-size:13px;">Desconto${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${fmtMoney(order.discount_amount)}</div>`
    : '';

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
  .check-item { 
    display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: bold;
  }
  .check-box {
    width: 16px; height: 16px; border: 2px solid #000; display: inline-block;
  }
  @media print {
    body { width: 80mm; padding: 2mm 3mm; }
  }
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
  <table style="margin-top:4px;">
    ${marmitaRows}
  </table>
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

<div class="divider"></div>

<!-- VALORES -->
<table>
  <tr>
    <td style="font-size:13px;">Subtotal</td>
    <td style="text-align:right;font-size:13px;">${fmtMoney(order.subtotal)}</td>
  </tr>
  ${order.delivery_fee > 0 ? `<tr>
    <td style="font-size:13px;">Entrega</td>
    <td style="text-align:right;font-size:13px;">${fmtMoney(order.delivery_fee)}</td>
  </tr>` : ''}
</table>
${discountLine}
<div style="font-size:20px;font-weight:bold;text-align:right;margin-top:4px;">
  TOTAL: ${fmtMoney(order.total)}
</div>

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

export const printThermalTicket = (order: ThermalOrder, brandName = 'DIETA JÁ'): void => {
  const html = generateThermalTicketHTML(order, brandName);
  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) {
    alert('Habilite pop-ups para imprimir.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
};
