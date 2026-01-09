/**
 * Configurações centralizadas do site
 * 
 * Este arquivo contém todas as configurações personalizáveis do projeto.
 * Para personalizar para um novo cliente, basta editar este arquivo.
 * 
 * ATENÇÃO: Algumas configurações precisam ser atualizadas manualmente:
 * - index.html: Meta tags, Facebook Pixel ID, Open Graph
 * - Secrets do backend (Lovable Cloud): MERCADOPAGO_ACCESS_TOKEN, NOTIFICAME_API_TOKEN, etc.
 */

export const siteConfig = {
  // =====================================
  // IDENTIDADE DA MARCA
  // =====================================
  brand: {
    /** Nome da marca (exibido no logo e textos) */
    name: "Dieta Já",
    /** Nome formatado para o logo (DietaJá) */
    nameFormatted: "DietaJá",
    /** Slogan da marca */
    slogan: "Alimentação Saudável Pronta",
    /** Handle do Twitter/X */
    twitterHandle: "@DietaJa",
  },

  // =====================================
  // LOCALIZAÇÃO E LOGÍSTICA
  // =====================================
  location: {
    /** Cidade de operação */
    city: "Vitória da Conquista",
    /** Estado (sigla) */
    state: "BA",
    /** Bairro para retirada grátis */
    pickupNeighborhood: "Recreio",
    /** Taxa de entrega em reais */
    deliveryFee: 10,
  },

  // =====================================
  // CONTATO
  // =====================================
  contact: {
    /** Número do WhatsApp (apenas números, com código do país) */
    whatsapp: "5577991001658",
    /** Número formatado para exibição */
    whatsappFormatted: "(77) 99100-1658",
  },

  // =====================================
  // URLs E DOMÍNIO
  // =====================================
  urls: {
    /** Domínio principal */
    domain: "dietaja.com.br",
    /** URL canônica completa */
    canonical: "https://dietaja.com.br",
    /** URL da imagem Open Graph */
    ogImage: "https://dietaja.com.br/og-image.jpg",
  },

  // =====================================
  // MARKETING / ANALYTICS
  // =====================================
  analytics: {
    /** ID do Pixel do Facebook/Meta */
    facebookPixelId: "901477464237603",
  },

  // =====================================
  // SEO
  // =====================================
  seo: {
    /** Título padrão da página */
    title: "Dieta Já | Alimentação Saudável Pronta em Vitória da Conquista",
    /** Descrição meta */
    description: "Kits detox e marmitas saudáveis prontas para quem tem rotina corrida em Vitória da Conquista. Coma melhor sem precisar cozinhar.",
  },

  // =====================================
  // TEMA VISUAL
  // =====================================
  theme: {
    /** Cor primária (hex) */
    primaryColor: "#22c55e",
  },
} as const;

// =====================================
// HELPERS
// =====================================

/**
 * Gera um link para o WhatsApp com mensagem pré-preenchida
 */
export const getWhatsAppLink = (message: string): string => {
  return `https://wa.me/${siteConfig.contact.whatsapp}?text=${encodeURIComponent(message)}`;
};

/**
 * Gera mensagem padrão para contato via WhatsApp
 */
export const getDefaultWhatsAppMessage = (utmSummary?: string): string => {
  return `Oi 😊\nVi o site da *${siteConfig.brand.name}* e quero saber mais sobre os kits!\n\n📍 Estou em *${siteConfig.location.city}*${utmSummary || ''}`;
};

/**
 * Formata valor em reais
 */
export const formatCurrency = (value: number): string => {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

// Type export para uso em outros arquivos
export type SiteConfig = typeof siteConfig;
