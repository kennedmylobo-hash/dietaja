interface QuoteMessageItem {
  number: number;
  description: string;
  totalWeight: number;
  price: number;
}

interface PackageOption {
  label: string;
  days: number;
  discount: number;
}

interface QuoteMessageParams {
  brandName: string;
  quoteNumber: string;
  customerName: string;
  items: QuoteMessageItem[];
  subtotalPerUnit: number;
  packageOptions: PackageOption[];
  notes?: string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function buildFormattedQuoteMessage(params: QuoteMessageParams): string {
  const { brandName, quoteNumber, customerName, items, subtotalPerUnit, packageOptions, notes } = params;
  const date = new Date().toLocaleDateString("pt-BR");

  let msg = "";
  msg += `═══════════════════════\n`;
  msg += `   🥗 *${brandName}*\n`;
  msg += `   _Orçamento Dieta Personalizada_\n`;
  msg += `═══════════════════════\n\n`;

  msg += `📋 *Orçamento Nº:* ${quoteNumber}\n`;
  msg += `📅 *Data:* ${date}\n`;
  if (customerName) msg += `👤 *Cliente:* ${customerName}\n`;
  msg += `\n`;

  msg += `──────────────────────\n`;
  msg += `📦 *ITENS POR REFEIÇÃO:*\n`;
  msg += `──────────────────────\n\n`;

  items.forEach((item) => {
    msg += `${item.number}. ${item.description} (${item.totalWeight}g) — ${formatCurrency(item.price)}\n`;
  });

  msg += `\n💰 *Subtotal por refeição:* ${formatCurrency(subtotalPerUnit)}\n\n`;

  msg += `──────────────────────\n`;
  msg += `📦 *PACOTES DISPONÍVEIS:*\n`;
  msg += `──────────────────────\n\n`;

  packageOptions.forEach((pkg) => {
    const total = subtotalPerUnit * items.length * pkg.days * (1 - pkg.discount);
    const discountLabel = pkg.discount > 0 ? ` _(${Math.round(pkg.discount * 100)}% desc.)_` : "";
    msg += `• *Kit ${pkg.label}:* ${formatCurrency(total)}${discountLabel}\n`;
  });

  msg += `\n──────────────────────\n`;
  msg += `ℹ️ *INFORMAÇÕES IMPORTANTES:*\n`;
  msg += `──────────────────────\n\n`;
  msg += `📦 Entrega em até *3 dias úteis* após confirmação.\n`;
  msg += `✅ Pedidos confirmados somente após o pagamento.\n`;
  msg += `💳 Formas de pagamento: *PIX* ou *cartão de crédito* (link de pagamento).\n`;

  if (notes) {
    msg += `\n📝 _Obs: ${notes}_\n`;
  }

  msg += `\n🙋 Dúvidas? Estamos à disposição! 💚`;

  return msg;
}
