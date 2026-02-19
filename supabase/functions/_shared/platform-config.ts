/**
 * Central platform configuration for Edge Functions.
 * Update PLATFORM_DOMAIN when a custom domain (e.g. dietajavca.com.br) is connected.
 */
export const PLATFORM_DOMAIN = "diet-on-demand.lovable.app";

export function getPlatformUrl(path: string, tenantSlug?: string): string {
  const base = `https://${PLATFORM_DOMAIN}${path}`;
  if (tenantSlug) {
    return `${base}?tenant=${tenantSlug}`;
  }
  return base;
}
