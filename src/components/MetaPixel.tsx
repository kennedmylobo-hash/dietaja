import { useEffect } from "react";
import { useTenantConfig } from "@/hooks/useTenantConfig";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
  }
}

const MetaPixel = () => {
  const { analytics } = useTenantConfig();
  const pixelId = analytics.facebookPixelId;

  useEffect(() => {
    if (!pixelId || typeof window === "undefined") return;

    // Prevent double-init
    if (document.getElementById("fb-pixel-script")) return;

    // fbq inline base code
    const f = window;
    const b = document;
    if (f.fbq) return;

    const n: any = (f.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    const s = b.createElement("script");
    s.id = "fb-pixel-script";
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = b.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(s, firstScript);

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  }, [pixelId]);

  if (!pixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
};

export default MetaPixel;
