// Print utilities for order tickets and production panels

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
  flavors?: { name: string; quantity: number; category?: string }[];
}

interface Order {
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

interface ProductionItem {
  flavorName: string;
  category: string;
  totalQuantity: number;
  sides: { name: string; weightPerUnit: number; totalWeight: number }[];
  customers: { name: string; quantity: number }[];
}

interface ProductionData {
  marmitas: ProductionItem[];
  juices: { emoji: string; name: string; quantity: number }[];
  soups: { emoji: string; name: string; quantity: number }[];
  totals: { marmitas: number; juices: number; soups: number };
  date: string;
}

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateShort = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const generateOrderTicketHTML = (order: Order): string => {
  const itemsHtml = order.items.map(item => {
    if (item.flavors && item.flavors.length > 0) {
      const flavorsGrouped = item.flavors.reduce((acc, f) => {
        acc[f.name] = (acc[f.name] || 0) + f.quantity;
        return acc;
      }, {} as Record<string, number>);
      
      const flavorLines = Object.entries(flavorsGrouped)
        .map(([name, qty]) => `    • ${qty}x ${name}`)
        .join('<br>');
      
      return `<div style="margin-bottom: 8px;">
        <strong>${item.quantity}x ${item.name}</strong> - ${formatCurrency(item.totalPrice)}<br>
        ${flavorLines}
      </div>`;
    }
    return `<div style="margin-bottom: 8px;">
      <strong>${item.quantity}x ${item.name}</strong> - ${formatCurrency(item.totalPrice)}
    </div>`;
  }).join('');

  const deliveryInfo = order.delivery_option === 'delivery' 
    ? `<p><strong>📍 Delivery:</strong> ${order.delivery_address || 'Não informado'}</p>`
    : `<p><strong>🏪 Retirada:</strong> Loja Recreio</p>`;

  const discountLine = order.discount_amount && order.discount_amount > 0
    ? `<p>Desconto${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${formatCurrency(order.discount_amount)}</p>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ficha do Pedido ${order.order_number || order.id.slice(0, 8)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          padding: 20px; 
          max-width: 400px; 
          margin: 0 auto;
          font-size: 14px;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px dashed #333; 
          padding-bottom: 15px; 
          margin-bottom: 15px; 
        }
        .header h1 { font-size: 24px; font-weight: bold; }
        .header h2 { font-size: 16px; color: #666; margin-top: 5px; }
        .order-info { margin-bottom: 15px; }
        .order-info p { margin: 3px 0; }
        .section { 
          border-top: 1px dashed #ccc; 
          padding-top: 10px; 
          margin-top: 10px; 
        }
        .section-title { 
          font-weight: bold; 
          font-size: 13px; 
          color: #333; 
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .items { margin: 10px 0; }
        .totals { 
          border-top: 2px dashed #333; 
          padding-top: 10px; 
          margin-top: 15px; 
        }
        .totals p { margin: 3px 0; }
        .total-line { font-size: 18px; font-weight: bold; }
        .checkboxes { 
          border-top: 1px dashed #ccc; 
          padding-top: 15px; 
          margin-top: 20px;
          display: flex;
          gap: 20px;
        }
        .checkbox-item { display: flex; align-items: center; gap: 5px; }
        .checkbox { 
          width: 18px; 
          height: 18px; 
          border: 2px solid #333; 
          display: inline-block;
        }
        .signature { 
          border-top: 1px dashed #ccc; 
          padding-top: 15px; 
          margin-top: 20px; 
        }
        .signature-line { 
          border-bottom: 1px solid #333; 
          width: 100%; 
          height: 30px; 
          margin-top: 20px; 
        }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>DIETA JÁ</h1>
        <h2>Ficha de Pedido</h2>
      </div>

      <div class="order-info">
        <p><strong>Pedido:</strong> #${order.order_number || order.id.slice(0, 8)}</p>
        <p><strong>Data:</strong> ${formatDate(order.created_at)}</p>
      </div>

      <div class="section">
        <div class="section-title">👤 Cliente</div>
        <p><strong>Nome:</strong> ${order.customer_name}</p>
        <p><strong>WhatsApp:</strong> ${formatPhone(order.customer_phone)}</p>
        <p><strong>Email:</strong> ${order.customer_email}</p>
      </div>

      <div class="section">
        <div class="section-title">🚚 Entrega</div>
        ${deliveryInfo}
      </div>

      <div class="section">
        <div class="section-title">📦 Itens</div>
        <div class="items">
          ${itemsHtml}
        </div>
      </div>

      <div class="totals">
        <div class="section-title">💰 Valores</div>
        <p>Subtotal: ${formatCurrency(order.subtotal)}</p>
        ${order.delivery_fee > 0 ? `<p>Entrega: ${formatCurrency(order.delivery_fee)}</p>` : ''}
        ${discountLine}
        <p class="total-line">TOTAL: ${formatCurrency(order.total)}</p>
      </div>

      <div class="checkboxes">
        <div class="checkbox-item"><span class="checkbox"></span> Separado</div>
        <div class="checkbox-item"><span class="checkbox"></span> Conferido</div>
        <div class="checkbox-item"><span class="checkbox"></span> Entregue</div>
      </div>

      <div class="signature">
        <p>Assinatura:</p>
        <div class="signature-line"></div>
      </div>
    </body>
    </html>
  `;
};

export const printOrderTicket = (order: Order): void => {
  const printWindow = window.open('', '_blank', 'width=450,height=600');
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se pop-ups estão habilitados.');
    return;
  }
  
  printWindow.document.write(generateOrderTicketHTML(order));
  printWindow.document.close();
  
  // Wait for content to load before printing
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

export const generateProductionHTML = (data: ProductionData): string => {
  const marmitasHtml = data.marmitas.map(item => {
    const sidesHtml = item.sides.map(s => 
      `<div style="margin-left: 20px; color: #666;">⚖️ ${s.name}: ${item.totalQuantity} × ${s.weightPerUnit}g = ${s.totalWeight}g</div>`
    ).join('');
    
    const customersHtml = item.customers.map(c => `${c.name} (${c.quantity})`).join(', ');
    
    return `
      <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
        <div style="font-weight: bold; font-size: 15px;">${item.flavorName}</div>
        <div style="margin: 5px 0;">📊 Quantidade: ${item.totalQuantity} unidades</div>
        ${sidesHtml}
        <div style="margin-top: 8px; font-size: 12px; color: #888;">
          👥 Clientes: ${customersHtml}
        </div>
      </div>
    `;
  }).join('');

  const juicesHtml = data.juices.map(j => 
    `<div style="padding: 5px 0;">${j.emoji} ${j.name}: ${j.quantity} unidades</div>`
  ).join('');

  const soupsHtml = data.soups.map(s => 
    `<div style="padding: 5px 0;">${s.emoji} ${s.name}: ${s.quantity} unidades</div>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Produção do Dia - ${data.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          padding: 20px; 
          max-width: 800px; 
          margin: 0 auto;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #333; 
          padding-bottom: 15px; 
          margin-bottom: 20px; 
        }
        h1 { font-size: 24px; }
        h2 { font-size: 14px; color: #666; margin-top: 5px; }
        .section { margin-bottom: 25px; }
        .section-header { 
          background: #333; 
          color: white; 
          padding: 8px 15px; 
          font-weight: bold;
          border-radius: 5px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
        }
        .totals-bar {
          background: #4CAF50;
          color: white;
          padding: 15px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          border-radius: 8px;
          margin-top: 20px;
        }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>👨‍🍳 PRODUÇÃO DO DIA</h1>
        <h2>${data.date}</h2>
      </div>

      ${data.marmitas.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <span>🥩 MARMITAS</span>
            <span>Total: ${data.totals.marmitas}</span>
          </div>
          ${marmitasHtml}
        </div>
      ` : ''}

      ${data.juices.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <span>🥤 SUCOS DETOX</span>
            <span>Total: ${data.totals.juices}</span>
          </div>
          ${juicesHtml}
        </div>
      ` : ''}

      ${data.soups.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <span>🥣 SOPAS</span>
            <span>Total: ${data.totals.soups}</span>
          </div>
          ${soupsHtml}
        </div>
      ` : ''}

      <div class="totals-bar">
        📊 TOTAL GERAL: ${data.totals.marmitas} marmitas + ${data.totals.juices} sucos + ${data.totals.soups} sopas
      </div>
    </body>
    </html>
  `;
};

export const printProductionPanel = (data: ProductionData): void => {
  const printWindow = window.open('', '_blank', 'width=850,height=700');
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se pop-ups estão habilitados.');
    return;
  }
  
  printWindow.document.write(generateProductionHTML(data));
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

export const generateWhatsAppProductionText = (data: ProductionData): string => {
  const lines: string[] = [];
  
  lines.push(`👨‍🍳 *PRODUÇÃO DO DIA - ${data.date}*`);
  lines.push('');

  if (data.marmitas.length > 0) {
    lines.push('*🥩 MARMITAS*');
    data.marmitas.forEach(m => {
      const sidesText = m.sides.map(s => s.name.toLowerCase()).join(' + ');
      lines.push(`• ${m.totalQuantity}x ${m.flavorName}${sidesText ? ` (${sidesText})` : ''}`);
    });
    lines.push('');
  }

  if (data.juices.length > 0) {
    lines.push('*🥤 SUCOS DETOX*');
    data.juices.forEach(j => {
      lines.push(`• ${j.quantity}x ${j.emoji} ${j.name}`);
    });
    lines.push('');
  }

  if (data.soups.length > 0) {
    lines.push('*🥣 SOPAS*');
    data.soups.forEach(s => {
      lines.push(`• ${s.quantity}x ${s.emoji} ${s.name}`);
    });
    lines.push('');
  }

  lines.push(`📊 *TOTAL: ${data.totals.marmitas} marmitas + ${data.totals.juices} sucos + ${data.totals.soups} sopas*`);

  return lines.join('\n');
};

export const shareViaWhatsApp = (text: string, phone?: string): void => {
  const encodedText = encodeURIComponent(text);
  const url = phone 
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank');
};
