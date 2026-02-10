import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Shows a floating "Update available" banner when the Service Worker
 * detects a new version OR when the APP_VERSION doesn't match.
 * Also provides a manual "force update" button that clears ALL caches.
 */
const ForceUpdateBanner = () => {
  const [swUpdate, setSwUpdate] = useState(false);

  useEffect(() => {
    // Listen for SW update
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New SW installed but waiting — show banner
                setSwUpdate(true);
              }
            });
          }
        });

        // Also check immediately if there's a waiting worker
        if (reg.waiting) {
          setSwUpdate(true);
        }

        // Force check for updates
        reg.update().catch(() => {});
      });
    }
  }, []);

  const handleForceUpdate = async () => {
    try {
      // 1. Unregister all service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }

      // 2. Clear all caches
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }

      // 3. Clear localStorage version key so it re-checks
      localStorage.removeItem("app_version");

      // 4. Hard reload bypassing cache
      window.location.href = window.location.origin + "?cache_bust=" + Date.now();
    } catch {
      window.location.reload();
    }
  };

  if (!swUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground py-2 px-4 flex items-center justify-center gap-3 text-sm shadow-lg animate-in slide-in-from-top">
      <RefreshCw className="w-4 h-4 animate-spin" />
      <span>Nova versão disponível!</span>
      <button
        onClick={handleForceUpdate}
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full font-semibold transition-colors"
      >
        Atualizar agora
      </button>
    </div>
  );
};

export default ForceUpdateBanner;
