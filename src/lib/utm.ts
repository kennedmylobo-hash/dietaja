/**
 * UTM Tracking Utilities
 * Captura parâmetros UTM da URL para rastreamento de campanhas
 */

export function getUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  
  const utms: Record<string, string> = {};
  utmKeys.forEach(key => {
    const value = params.get(key);
    if (value) utms[key] = value;
  });
  
  return utms;
}

export function getUTMSummary(): string {
  if (typeof window === 'undefined') return '';
  
  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source');
  const campaign = params.get('utm_campaign');
  
  if (!source) return '';
  
  let summary = `\n\n🎯 *Campanha:* ${source}`;
  if (campaign) summary += ` / ${campaign}`;
  
  return summary;
}
