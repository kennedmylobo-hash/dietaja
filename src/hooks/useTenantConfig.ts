import { useTenant } from '@/contexts/TenantContext';
import { siteConfig, formatCurrency } from '@/config/site';

/**
 * Hook that returns tenant-aware config with the same shape as siteConfig.
 * Falls back to siteConfig defaults when tenant data is not available.
 */
export const useTenantConfig = () => {
  const { tenant } = useTenant();

  const brand = {
    name: tenant?.brand_name || siteConfig.brand.name,
    slogan: tenant?.brand_slogan || siteConfig.brand.slogan,
    logoUrl: tenant?.logo_url || null,
  };

  const location = {
    city: tenant?.city || siteConfig.location.city,
    state: tenant?.state || siteConfig.location.state,
    pickupNeighborhood: tenant?.pickup_neighborhood || siteConfig.location.pickupNeighborhood,
    deliveryFee: tenant?.delivery_fee ?? siteConfig.location.deliveryFee,
  };

  const contact = {
    whatsapp: tenant?.whatsapp || siteConfig.contact.whatsapp,
    whatsappFormatted: tenant?.whatsapp_formatted || siteConfig.contact.whatsappFormatted,
  };

  const analytics = {
    facebookPixelId: tenant?.facebook_pixel_id || siteConfig.analytics.facebookPixelId,
    googleAnalyticsId: tenant?.google_analytics_id || null,
  };

  const domain = tenant?.domain || siteConfig.urls.domain;
  const canonical = domain ? `https://${domain}` : siteConfig.urls.canonical;

  const urls = {
    domain,
    canonical,
    ogImage: tenant?.og_image_url || `${canonical}/og-image.jpg`,
  };

  const seo = {
    title: `${brand.name} | ${brand.slogan} em ${location.city}`,
    description: `Kits detox e marmitas saudáveis prontas para quem tem rotina corrida em ${location.city}. Coma melhor sem precisar cozinhar.`,
  };

  const delivery = {
    cutoffDay: tenant?.cutoff_day ?? 0,
    cutoffTime: tenant?.cutoff_time ?? '18:00:00',
    productionDay: tenant?.production_day ?? 2,
    deliveryDays: tenant?.delivery_days ?? [1],
    cutoffMessage: tenant?.cutoff_message ?? 'Pedidos até domingo às 18h são produzidos na terça.',
  };

  const theme = {
    primaryColor: tenant?.primary_color || siteConfig.theme.primaryColor,
  };

  const getWhatsAppLink = (message: string): string => {
    return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
  };

  const getDefaultWhatsAppMessage = (utmSummary?: string): string => {
    return `Oi 😊\nVi o site da *${brand.name}* e quero saber mais sobre os kits!\n\n📍 Estou em *${location.city}*${utmSummary || ''}`;
  };

  return {
    brand,
    location,
    contact,
    analytics,
    urls,
    seo,
    delivery,
    theme,
    formatCurrency,
    getWhatsAppLink,
    getDefaultWhatsAppMessage,
  };
};
