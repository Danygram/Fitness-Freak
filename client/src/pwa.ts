// Registers the service worker in production only, so it never fights
// Vite's dev HMR. Test the installable PWA with `npm run build && npm run preview`.
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[pwa] service worker registration failed:', err);
    });
  });
}
