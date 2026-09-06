// Registers the service worker in production web builds only.
// Inside the Capacitor APK the WebView already ships the bundle locally, so the
// SW is skipped there (Capacitor serves from a capacitor:// / https://localhost origin).
const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

if (import.meta.env.PROD && !isNative && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Ask a waiting worker to take over so users get updates on next load.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) nw.postMessage('SKIP_WAITING');
        });
      });
    }).catch(() => { /* PWA is progressive: ignore registration failures */ });
  });
}
