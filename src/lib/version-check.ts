// Change this value on each meaningful deploy to force cache bust
const APP_VERSION = '2026-02-23-v1';

const VERSION_KEY = 'app_version';

export function checkAppVersion() {
  const stored = localStorage.getItem(VERSION_KEY);
  
  if (stored && stored !== APP_VERSION) {
    // Version mismatch — nuke everything and reload
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    nukeAndReload();
    return;
  }
  
  if (!stored) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  }
}

/**
 * Auto-recovery: if the page fails to render within 6 seconds,
 * it's likely a stale cache issue. Nuke caches and reload once.
 * Uses a flag to avoid infinite reload loops.
 */
export function setupAutoRecovery() {
  const RECOVERY_KEY = 'auto_recovery_attempted';
  const alreadyTried = sessionStorage.getItem(RECOVERY_KEY);

  // Give the app 6s to render something meaningful
  const timeout = setTimeout(() => {
    const root = document.getElementById('root');
    const hasContent = root && root.children.length > 0 && root.innerHTML.length > 200;

    if (!hasContent && !alreadyTried) {
      sessionStorage.setItem(RECOVERY_KEY, '1');
      nukeAndReload();
    }
  }, 6000);

  // If app renders fine, clear the flag and timeout
  const observer = new MutationObserver(() => {
    const root = document.getElementById('root');
    if (root && root.children.length > 0 && root.innerHTML.length > 200) {
      clearTimeout(timeout);
      sessionStorage.removeItem(RECOVERY_KEY);
      observer.disconnect();
    }
  });

  observer.observe(document.getElementById('root')!, { childList: true, subtree: true });
}

async function nukeAndReload() {
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    // 2. Clear all caches
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }

    // 3. Hard reload
    window.location.href = window.location.origin + '?v=' + Date.now();
  } catch {
    window.location.reload();
  }
}
