import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      event_name,
      event_id,
      value,
      currency = "BRL",
      customer_email,
      customer_phone,
      source_url,
      tenant_id,
      fbp,
      fbc,
      client_user_agent,
      custom_data,
    } = await req.json();

    const accessToken = Deno.env.get("META_CONVERSIONS_API_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "META_CONVERSIONS_API_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedCustomData =
      custom_data && typeof custom_data === "object" && !Array.isArray(custom_data)
        ? (custom_data as Record<string, unknown>)
        : {};

    // Get pixel ID from tenant
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const tenantFilter = tenant_id || "00000000-0000-0000-0000-000000000001";
    const { data: tenant } = await supabase
      .from("tenants")
      .select("facebook_pixel_id")
      .eq("id", tenantFilter)
      .single();

    const pixelId = tenant?.facebook_pixel_id;
    if (!pixelId) {
      return new Response(
        JSON.stringify({ error: "No facebook_pixel_id configured for tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user_data with hashed PII + browser identifiers for better match quality
    const userData: Record<string, unknown> = {};
    if (customer_email) userData.em = [await sha256(customer_email)];
    if (customer_phone) {
      const phone = customer_phone.replace(/\D/g, "");
      if (phone) userData.ph = [await sha256(phone)];
    }
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const forwardedUserAgent = client_user_agent || req.headers.get("user-agent") || "";
    if (forwardedUserAgent) userData.client_user_agent = forwardedUserAgent;

    // Get client IP from request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "";
    if (clientIp) userData.client_ip_address = clientIp;

    const parsedValue = Number(value ?? normalizedCustomData.value ?? 0);

    const eventData = {
      data: [
        {
          event_name: event_name || "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url: source_url,
          action_source: "website",
          user_data: userData,
          custom_data: {
            ...normalizedCustomData,
            value: Number.isFinite(parsedValue) ? parsedValue : 0,
            currency,
          },
        },
      ],
      access_token: accessToken,
    };

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      }
    );

    const result = await response.text();
    console.log("Meta CAPI response:", response.status, result);

    return new Response(
      JSON.stringify({ success: response.ok, status: response.status, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Meta CAPI error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
