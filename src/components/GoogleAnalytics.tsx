import { useEffect } from "react";
import { useTenantConfig } from "@/hooks/useTenantConfig";

const GoogleAnalytics = () => {
  const { analytics } = useTenantConfig();
  const gaId = analytics.googleAnalyticsId;

  useEffect(() => {
    if (!gaId || typeof window === "undefined") return;

    // Prevent double-init
    if (document.getElementById("ga4-script")) return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", gaId);

    // Load gtag.js script
    const script = document.createElement("script");
    script.id = "ga4-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
  }, [gaId]);

  return null;
};

export default GoogleAnalytics;
