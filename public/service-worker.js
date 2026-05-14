const CACHE_NAME = 'life-training-hub-v7';
const SHELL = [
  '/Livet/',
  '/Livet/index.html',
  '/Livet/manifest.json',
  '/Livet/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL).catch(() => undefined)
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

const isNavigation = (req) =>
  req.mode === 'navigate' || (req.method === 'GET' && req.destination === 'document');

// Strategy:
//  - HTML / navigation requests   → network-first, fall back to cached shell.
//    Critical so a new deploy is picked up immediately (the previous
//    cache-first strategy would pin clients to a stale index.html that
//    referenced bundle hashes no longer present on the server).
//  - Everything else (hashed JS/CSS, images, etc.) → cache-first.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (isNavigation(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/Livet/index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
