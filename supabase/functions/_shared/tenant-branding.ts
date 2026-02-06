import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TenantBranding {
  brand_name: string;
  whatsapp: string;
  whatsapp_formatted: string;
  logo_url: string | null;
  primary_color: string;
  city: string;
  state: string;
  domain: string | null;
  slug: string;
}

const DEFAULT_BRANDING: TenantBranding = {
  brand_name: "Dieta Já",
  whatsapp: "5577991001658",
  whatsapp_formatted: "(77) 99100-1658",
  logo_url: null,
  primary_color: "#22c55e",
  city: "Vitória da Conquista",
  state: "BA",
  domain: "dietajavca.com.br",
  slug: "dietaja",
};

/**
 * Fetches tenant branding info from the tenants table.
 * Falls back to Dieta Já defaults if tenant not found.
 */
export async function getTenantBranding(
  supabase: ReturnType<typeof createClient>,
  tenantId?: string | null
): Promise<TenantBranding> {
  if (!tenantId) return DEFAULT_BRANDING;

  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("brand_name, whatsapp, whatsapp_formatted, logo_url, primary_color, city, state, domain, slug")
      .eq("id", tenantId)
      .maybeSingle();

    if (error || !data) {
      console.warn(`Tenant ${tenantId} not found, using defaults`);
      return DEFAULT_BRANDING;
    }

    return {
      brand_name: data.brand_name || DEFAULT_BRANDING.brand_name,
      whatsapp: data.whatsapp || DEFAULT_BRANDING.whatsapp,
      whatsapp_formatted: data.whatsapp_formatted || DEFAULT_BRANDING.whatsapp_formatted,
      logo_url: data.logo_url,
      primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
      city: data.city || DEFAULT_BRANDING.city,
      state: data.state || DEFAULT_BRANDING.state,
      domain: data.domain || DEFAULT_BRANDING.domain,
      slug: data.slug || DEFAULT_BRANDING.slug,
    };
  } catch (err) {
    console.error("Error fetching tenant branding:", err);
    return DEFAULT_BRANDING;
  }
}

/**
 * Gets the base URL for a tenant (for links in emails/whatsapp).
 */
export function getTenantBaseUrl(branding: TenantBranding): string {
  if (branding.domain) return `https://${branding.domain}`;
  return `https://${branding.slug}.suaplataforma.com.br`;
}
