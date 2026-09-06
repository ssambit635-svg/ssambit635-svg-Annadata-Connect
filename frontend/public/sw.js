/* Annadata Connect service worker.
 * - App shell (HTML/JS/CSS/fonts/icons): cache-first with background refresh.
 * - /api/*: network-first with a short cache fallback so the last known
 *   dashboard/queue still renders when the free-tier backend is cold or the
 *   farmer is briefly offline. Mutations (POST/PUT/PATCH/DELETE) are never cached.
 */
const VERSION = 'anc-v3';
const SHELL = `${VERSION}-shell`;
const API = `${VERSION}-api`;
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isApi(url) {
  return url.pathname.startsWith('/api/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isApi(url)) {
    if (url.pathname.startsWith('/api/auth')) return; // never cache auth
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(API).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || new Response(JSON.stringify({ error: { code: 'OFFLINE', message: 'You are offline' } }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  // Navigations: network first, fall back to cached shell (SPA routing).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { caches.open(SHELL).then((c) => c.put('/index.html', res.clone())); return res; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req).then((res) => {
        if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
