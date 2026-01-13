/// <reference types="vite/client" />

interface Window {
  fbq: (...args: unknown[]) => void;
  gtag: (...args: unknown[]) => void;
  dataLayer: unknown[];
}
