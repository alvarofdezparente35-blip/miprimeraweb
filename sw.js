// ═══════════════════════════════════════════════════════════════════════════
// LumiCharge Service Worker — Cache-first strategy for static assets
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'lumicharge-v1';
const RUNTIME_CACHE = 'lumicharge-runtime-v1';

// Assets to pre-cache on install (critical path)
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Assets to cache on first fetch (fonts, scripts, styles)
const CACHE_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdnjs\.cloudflare\.com/,
];

// ── INSTALL: pre-cache critical assets ───────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const validCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => !validCaches.includes(k))
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: stale-while-revalidate for pages, cache-first for assets ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except CDN patterns)
  if(request.method !== 'GET') return;

  // Cache-first for fonts and CDN assets
  if(CACHE_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(
      caches.match(request).then(cached => {
        if(cached) return cached;
        return fetch(request).then(response => {
          if(response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for HTML pages
  if(request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if(response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached); // fallback to cache if offline
          return cached || fetchPromise;
        })
      )
    );
    return;
  }
});

// ── BACKGROUND SYNC: retry failed orders ─────────────────────────────────────
self.addEventListener('sync', event => {
  if(event.tag === 'retry-order') {
    event.waitUntil(retryPendingOrders());
  }
});

async function retryPendingOrders() {
  // In production: read from IndexedDB and retry Stripe/backend calls
  console.log('[SW] Retrying pending orders...');
}

// ── PUSH NOTIFICATIONS (placeholder) ─────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'LumiCharge', body: '¡Tu pedido está en camino! 🚀' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'lumicharge-notif',
      renotify: true,
      actions: [
        { action: 'track', title: '📦 Rastrear pedido' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if(event.action === 'track') {
    clients.openWindow('https://lumicharge.es/tracking');
  }
});

console.log('[LumiCharge SW] v1 loaded');
