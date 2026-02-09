// Change this value on each meaningful deploy to force cache bust
const APP_VERSION = '2025-02-09-v1';

const VERSION_KEY = 'app_version';

export function checkAppVersion() {
  const stored = localStorage.getItem(VERSION_KEY);
  
  if (stored && stored !== APP_VERSION) {
    // Version mismatch — clear SW caches and reload
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    window.location.reload();
    return;
  }
  
  if (!stored) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  }
}
