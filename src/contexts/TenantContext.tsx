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
            .from('tenants_public' as any)
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

        // Detect tenant by hostname first
        let detectedTenant: TenantConfig | null = null;

        const hostname = window.location.hostname;

        // In development / preview, use fallback
        if (hostname === 'localhost' || hostname.includes('lovable.app') || hostname.includes('lovable.dev')) {
          detectedTenant = fallbackTenant;
        } else {
          // Extract slug from subdomain
          const platformDomains = ['suaplataforma.com.br'];
          let extractedSlug: string | null = null;
          for (const pd of platformDomains) {
            if (hostname.endsWith(`.${pd}`)) {
              extractedSlug = hostname.replace(`.${pd}`, '');
              break;
            }
          }

          const orConditions = [`domain.eq.${hostname}`];
          // Also try www variant and without www
          if (hostname.startsWith('www.')) {
            orConditions.push(`domain.eq.${hostname.slice(4)}`);
          } else {
            orConditions.push(`domain.eq.www.${hostname}`);
          }
          // Try matching subdomains of the same root domain (e.g. sub.dietajavca.com.br)
          const rootDomain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
          orConditions.push(`domain.ilike.%.${rootDomain}`);
          if (extractedSlug) {
            orConditions.push(`slug.eq.${extractedSlug}`);
          } else {
            orConditions.push(`slug.eq.${hostname.split('.')[0]}`);
          }

          const { data, error: fetchError } = await supabase
            .from('tenants_public' as any)
            .select('*')
            .or(orConditions.join(','))
            .eq('is_active', true)
            .maybeSingle();

          if (fetchError) {
            console.error('Error fetching tenant:', fetchError);
            detectedTenant = fallbackTenant;
          } else if (data) {
            detectedTenant = mapTenantRow(data);
          } else {
            setError('Restaurante não encontrado');
            detectedTenant = fallbackTenant;
          }
        }

        // Check if there's an authenticated admin — override tenant if so
        const isAdminPage = window.location.pathname.startsWith('/admin');
        if (isAdminPage) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: adminTenantId } = await supabase
                .rpc('get_admin_tenant_id', { _user_id: session.user.id });

              if (adminTenantId) {
                const { data: adminTenant } = await supabase
                  .from('tenants')
                  .select('*')
                  .eq('id', adminTenantId)
                  .maybeSingle();

                if (adminTenant) {
                  console.log(`Admin override: using tenant "${adminTenant.brand_name}" instead of hostname`);
                  detectedTenant = mapTenantRow(adminTenant);
                }
              }
            }
          } catch (authErr) {
            console.error('Error checking admin tenant:', authErr);
          }
        }

        setTenant(detectedTenant);
      } catch (err) {
        console.error('Tenant detection error:', err);
        setTenant(fallbackTenant);
      } finally {
        setLoading(false);
      }
    };

    detectTenant();

    // Re-run tenant detection when auth state changes (admin login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        detectTenant();
      }
    });

    return () => subscription.unsubscribe();
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
