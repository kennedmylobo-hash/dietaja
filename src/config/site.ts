/**
 * Configurações FALLBACK do site (plataforma PedidoJá).
 * 
 * Estes valores são usados APENAS quando nenhum tenant está ativo.
 * Os dados reais de cada restaurante vêm do banco via TenantContext / useTenantConfig.
 */

export const siteConfig = {
  brand: {
    name: "Meu Restaurante",
    nameFormatted: "MeuRestaurante",
    slogan: "Alimentação Saudável Pronta",
    twitterHandle: "",
  },

  location: {
    city: "",
    state: "",
    pickupNeighborhood: "",
    deliveryFee: 10,
  },

  contact: {
    whatsapp: "",
    whatsappFormatted: "",
  },

  urls: {
    domain: "",
    canonical: "",
    ogImage: "",
  },

  analytics: {
    facebookPixelId: "",
  },

  seo: {
    title: "PedidoJá | Seu Restaurante Online",
    description: "Plataforma completa para restaurantes. Cardápio digital, pedidos online e gestão integrada.",
  },

  theme: {
    primaryColor: "#22c55e",
  },
} as const;

// =====================================
// HELPERS
// =====================================

export const getWhatsAppLink = (message: string): string => {
  return `https://wa.me/${siteConfig.contact.whatsapp}?text=${encodeURIComponent(message)}`;
};

export const getDefaultWhatsAppMessage = (utmSummary?: string): string => {
  return `Oi 😊\nVi o site e quero saber mais sobre os produtos!\n${utmSummary || ''}`;
};

export const formatCurrency = (value: number): string => {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

export type SiteConfig = typeof siteConfig;