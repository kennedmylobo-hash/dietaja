import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AsaasCredentials {
  apiKey: string;
  webhookToken: string | null;
}

export interface WhatsAppCredentials {
  apiToken: string;
  channelToken: string;
}

export interface EmailCredentials {
  apiKey: string;
  fromEmail: string;
}

/**
 * Fetches Asaas credentials for a tenant.
 * Falls back to global env vars if tenant has no custom credentials.
 */
export async function getAsaasCredentials(
  supabase: ReturnType<typeof createClient>,
  tenantId?: string | null
): Promise<AsaasCredentials> {
  if (tenantId) {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("asaas_api_key, asaas_webhook_token")
        .eq("id", tenantId)
        .maybeSingle();

      if (data?.asaas_api_key) {
        console.log(`[credentials] Using tenant-specific Asaas key for ${tenantId}`);
        return {
          apiKey: data.asaas_api_key,
          webhookToken: data.asaas_webhook_token || null,
        };
      }
    } catch (err) {
      console.warn(`[credentials] Error fetching tenant Asaas credentials:`, err);
    }
  }

  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY not configured");
  
  console.log(`[credentials] Using global Asaas key (fallback)`);
  return { apiKey, webhookToken: null };
}

/**
 * Fetches WhatsApp (NotificaMe) credentials for a tenant.
 * Falls back to global env vars if tenant has no custom credentials.
 */
export async function getWhatsAppCredentials(
  supabase: ReturnType<typeof createClient>,
  tenantId?: string | null
): Promise<WhatsAppCredentials | null> {
  if (tenantId) {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("notificame_api_token, notificame_channel_token")
        .eq("id", tenantId)
        .maybeSingle();

      if (data?.notificame_api_token && data?.notificame_channel_token) {
        console.log(`[credentials] Using tenant-specific WhatsApp tokens for ${tenantId}`);
        return {
          apiToken: data.notificame_api_token,
          channelToken: data.notificame_channel_token,
        };
      }
    } catch (err) {
      console.warn(`[credentials] Error fetching tenant WhatsApp credentials:`, err);
    }
  }

  const apiToken = Deno.env.get("NOTIFICAME_API_TOKEN");
  const channelToken = Deno.env.get("NOTIFICAME_WHATSAPP_CHANNEL_TOKEN");

  if (!apiToken || !channelToken) {
    console.warn(`[credentials] WhatsApp credentials not configured`);
    return null;
  }

  console.log(`[credentials] Using global WhatsApp tokens (fallback)`);
  return { apiToken, channelToken };
}

/**
 * Fetches Email (Resend) credentials for a tenant.
 * Falls back to global env vars if tenant has no custom credentials.
 */
export async function getEmailCredentials(
  supabase: ReturnType<typeof createClient>,
  tenantId?: string | null
): Promise<EmailCredentials> {
  if (tenantId) {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("resend_api_key, resend_from_email")
        .eq("id", tenantId)
        .maybeSingle();

      if (data?.resend_api_key) {
        console.log(`[credentials] Using tenant-specific Resend key for ${tenantId}`);
        return {
          apiKey: data.resend_api_key,
          fromEmail: data.resend_from_email || "noreply@dietajavca.com.br",
        };
      }
    } catch (err) {
      console.warn(`[credentials] Error fetching tenant Email credentials:`, err);
    }
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  console.log(`[credentials] Using global Resend key (fallback)`);
  return { apiKey, fromEmail: "noreply@dietajavca.com.br" };
}
