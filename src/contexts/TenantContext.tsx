import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { siteConfig } from '@/config/site';

export interface TenantConfig {
  id: string;
  slug: string;
  domain: string | null;
  brand_name: string;
  brand_slogan: string;
  logo_url: string | null;
  primary_color: string;
  city: string;
  state: string;
  whatsapp: string;
  whatsapp_formatted: string;
  delivery_fee: number;
  pickup_neighborhood: string;
  facebook_pixel_id: string | null;
  google_analytics_id: string | null;
  og_image_url: string | null;
  plan_type: string;
  plan_status: string;
  is_active: boolean;
}

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
});

// Default fallback from siteConfig (for backwards compatibility)
const fallbackTenant: TenantConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'dietaja',
  domain: null,
  brand_name: siteConfig.brand.name,
  brand_slogan: siteConfig.brand.slogan,
  logo_url: null,
  primary_color: siteConfig.theme.primaryColor,
  city: siteConfig.location.city,
  state: siteConfig.location.state,
  whatsapp: siteConfig.contact.whatsapp,
  whatsapp_formatted: siteConfig.contact.whatsappFormatted,
  delivery_fee: siteConfig.location.deliveryFee,
  pickup_neighborhood: siteConfig.location.pickupNeighborhood,
  facebook_pixel_id: siteConfig.analytics.facebookPixelId,
  google_analytics_id: null,
  og_image_url: null,
  plan_type: 'premium',
  plan_status: 'active',
  is_active: true,
};

const mapTenantRow = (row: any): TenantConfig => ({
  id: row.id,
  slug: row.slug,
  domain: row.domain,
  brand_name: row.brand_name,
  brand_slogan: row.brand_slogan,
  logo_url: row.logo_url,
  primary_color: row.primary_color,
  city: row.city,
  state: row.state,
  whatsapp: row.whatsapp,
  whatsapp_formatted: row.whatsapp_formatted,
  delivery_fee: Number(row.delivery_fee),
  pickup_neighborhood: row.pickup_neighborhood,
  facebook_pixel_id: row.facebook_pixel_id,
  google_analytics_id: row.google_analytics_id,
  og_image_url: row.og_image_url,
  plan_type: row.plan_type,
  plan_status: row.plan_status,
  is_active: row.is_active,
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectTenant = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tenantSlug = params.get('tenant');

        // If ?tenant=slug is present, resolve by slug (for testing)
        if (tenantSlug) {
          const { data: slugData, error: slugErr } = await supabase
            .from('tenants')
            .select('*')
            .eq('slug', tenantSlug)
            .eq('is_active', true)
            .maybeSingle();

          if (!slugErr && slugData) {
            setTenant(mapTenantRow(slugData));
          } else {
            console.warn(`Tenant slug "${tenantSlug}" not found, using fallback`);
            setTenant(fallbackTenant);
          }
          setLoading(false);
          return;
        }

        const hostname = window.location.hostname;

        // In development / preview, use fallback
        if (hostname === 'localhost' || hostname.includes('lovable.app') || hostname.includes('lovable.dev')) {
          setTenant(fallbackTenant);
          setLoading(false);
          return;
        }

        // Extract slug from subdomain (e.g., "pratinhofitness.suaplataforma.com.br" → "pratinhofitness")
        const platformDomains = ['suaplataforma.com.br']; // Add your platform domains here
        let extractedSlug: string | null = null;
        for (const pd of platformDomains) {
          if (hostname.endsWith(`.${pd}`)) {
            extractedSlug = hostname.replace(`.${pd}`, '');
            break;
          }
        }

        // Build query: try domain match OR slug from subdomain
        const orConditions = [`domain.eq.${hostname}`];
        if (extractedSlug) {
          orConditions.push(`slug.eq.${extractedSlug}`);
        } else {
          // Fallback: try first part of hostname as slug
          orConditions.push(`slug.eq.${hostname.split('.')[0]}`);
        }

        // Try to find tenant by domain or slug
        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .or(orConditions.join(','))
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching tenant:', fetchError);
          setTenant(fallbackTenant);
        } else if (data) {
          setTenant(mapTenantRow(data));
        } else {
          setError('Restaurante não encontrado');
          setTenant(fallbackTenant);
        }
      } catch (err) {
        console.error('Tenant detection error:', err);
        setTenant(fallbackTenant);
      } finally {
        setLoading(false);
      }
    };

    detectTenant();
  }, []);

  const value = useMemo(() => ({ tenant, loading, error }), [tenant, loading, error]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
