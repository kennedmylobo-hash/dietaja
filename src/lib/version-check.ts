// Change this value on each meaningful deploy to force cache bust
const APP_VERSION = '2026-02-10-v2';

const VERSION_KEY = 'app_version';

export function checkAppVersion() {
  const stored = localStorage.getItem(VERSION_KEY);
  
  if (stored && stored !== APP_VERSION) {
    // Version mismatch — nuke everything and reload
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Hard reload with cache bust
    window.location.href = window.location.origin + '?v=' + Date.now();
    return;
  }
  
  if (!stored) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  }
}
