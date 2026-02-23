import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { checkAppVersion, setupAutoRecovery } from "./lib/version-check";

// Force update when a new Service Worker takes control
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// Check if app version changed (clears old caches)
checkAppVersion();

// Auto-recover if page fails to render (stale cache)
setupAutoRecovery();

createRoot(document.getElementById("root")!).render(<App />);
