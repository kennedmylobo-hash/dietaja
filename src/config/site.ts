/**
 * Configurações FALLBACK do site (plataforma PedidoJá).
 * 
 * Estes valores são usados APENAS quando nenhum tenant está ativo.
 * Os dados reais de cada restaurante vêm do banco via TenantContext / useTenantConfig.
 */

export const siteConfig = {
  brand: {
    name: "Dieta Já",
    nameFormatted: "DietaJá",
    slogan: "Alimentação Saudável Pronta",
    twitterHandle: "",
  },

  location: {
    city: "Vitória da Conquista",
    state: "BA",
    pickupNeighborhood: "",
    deliveryFee: 10,
  },

  contact: {
    whatsapp: "",
    whatsappFormatted: "",
  },

  urls: {
    domain: "pedidos.dietajavca.com.br",
    canonical: "https://pedidos.dietajavca.com.br",
    ogImage: "https://pedidos.dietajavca.com.br/og-image.jpg",
  },

  analytics: {
    facebookPixelId: "",
  },

  seo: {
    title: "Dieta Já | Alimentação Saudável Pronta em Vitória da Conquista",
    description: "Marmitas saudáveis e kits detox prontos para sua rotina em Vitória da Conquista - BA. Peça online com Pix e receba com praticidade.",
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