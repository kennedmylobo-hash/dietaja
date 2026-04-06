import { supabase } from "@/integrations/supabase/client";

const STANDARD_META_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Lead",
  "Contact",
]);

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;

  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1] ?? null;
};

export const generateMetaEventId = (prefix = "meta") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const getMetaBrowserContext = () => {
  if (typeof window === "undefined") {
    return {
      fbp: null,
      fbc: null,
      sourceUrl: "",
      userAgent: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid");

  return {
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc") ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null),
    sourceUrl: window.location.href,
    userAgent: window.navigator.userAgent,
  };
};

interface TrackMetaEventOptions {
  eventName: string;
  eventId: string;
  params?: Record<string, unknown>;
  tenantId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  sourceUrl?: string;
}

export const trackMetaBrowserEvent = ({
  eventName,
  eventId,
  params = {},
}: Pick<TrackMetaEventOptions, "eventName" | "eventId" | "params">) => {
  if (typeof window === "undefined") return;

  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== "function") return;

  const options = eventId ? { eventID: eventId } : undefined;

  if (STANDARD_META_EVENTS.has(eventName)) {
    fbq("track", eventName, params, options);
    return;
  }

  fbq("trackCustom", eventName, params, options);
};

export const sendMetaCapiEvent = async ({
  eventName,
  eventId,
  params = {},
  tenantId,
  customerEmail,
  customerPhone,
  sourceUrl,
}: TrackMetaEventOptions) => {
  const { fbp, fbc, sourceUrl: currentSourceUrl, userAgent } = getMetaBrowserContext();

  try {
    await supabase.functions.invoke("meta-capi", {
      body: {
        event_name: eventName,
        event_id: eventId,
        value: Number(params.value ?? 0),
        currency: String(params.currency ?? "BRL"),
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        source_url: sourceUrl || currentSourceUrl,
        tenant_id: tenantId || null,
        fbp,
        fbc,
        client_user_agent: userAgent,
        custom_data: params,
      },
    });
  } catch (error) {
    console.debug("Meta CAPI error:", error);
  }
};

export const trackMetaEvent = (options: TrackMetaEventOptions) => {
  trackMetaBrowserEvent(options);
  void sendMetaCapiEvent(options);
};
