/**
 * CORS utilitário compartilhado entre as Edge Functions.
 *
 * Em vez de responder `Access-Control-Allow-Origin: '*'` (que combinado com a
 * apikey pública do Supabase permite que qualquer site invoque as funções),
 * refletimos apenas origens autorizadas, configuráveis via ALLOWED_ORIGINS.
 *
 * - ALLOWED_ORIGINS: lista separada por vírgulas (ex.: "https://dietaja.com.br,https://app.dietaja.com.br")
 * - Em dev (localhost) a origem é sempre aceita para facilitar testes locais.
 *
 * Webhooks que só são chamados por provedores externos (Asaas, InfinitePay,
 * Notifica.me) podem usar `buildCorsHeaders` sem reflexão — não há navegador
 * enviando credenciais, então a restrição de origem não se aplica.
 */

const ALLOWED_ORIGINS_ENV = Deno.env.get("ALLOWED_ORIGINS") || "";

const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isLocalhost(origin: string): boolean {
  return (
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1") ||
    origin.includes("lovable.app") ||
    origin.includes("lovable.dev")
  );
}

/**
 * Decide qual valor colocar no header `Access-Control-Allow-Origin`.
 * Retorna a própria origem se autorizada, ou null caso deva ser recusada.
 */
export function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isLocalhost(origin)) return origin;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

/**
 * Monta os headers CORS refletindo a origem do request (se autorizada).
 * Use em funções invocadas pelo front-end do app.
 *
 * Inclui os headers que o client supabase-js envia automaticamente em
 * `Access-Control-Allow-Headers` para não quebrar chamadas do browser.
 */
export function buildCorsHeaders(
  req?: Request
): Record<string, string> {
  const origin = req?.headers.get("origin") || req?.headers.get("Origin");
  const allowed = resolveAllowedOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowed || ALLOWED_ORIGINS[0] || "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime-version, x-supabase-client-language",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

/**
 * Headers CORS permissivos para webhooks (chamados server-to-server por
 * provedores como Asaas/InfinitePay). Não há navegador enviando credenciais,
 * então '*' é seguro aqui.
 */
export function buildWebhookCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
