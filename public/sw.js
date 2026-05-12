// ═══════════════════════════════════════════════════════════════════════════
// LumiCharge Service Worker — v2 (PWA)
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'lumicharge-v2';
const RUNTIME_CACHE = 'lumicharge-runtime-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/cart.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

const CDN_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdnjs\.cloudflare\.com/,
  /js\.stripe\.com/,
];

// ── INSTALL: pre-cache critical assets ───────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
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

// ── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // API requests — network only (never cache)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // CDN assets — cache-first
  if (CDN_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Vite built assets (hashes in filename) — cache-first, immutable
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Icons and manifest — cache-first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages — network-first with cache fallback (stale-while-revalidate)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else — network-first
  event.respondWith(networkFirst(request));
});

// ── STRATEGIES ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
    }
    return response;
  } catch {
    return caches.match(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline fallback page
    return caches.match('/');
  }
}

// ── BACKGROUND SYNC: retry failed orders ─────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'retry-order') {
    event.waitUntil(retryPendingOrders());
  }
});

async function retryPendingOrders() {
  // In production: read from IndexedDB and retry Stripe/backend calls
  console.log('[LumiCharge SW] Retrying pending orders...');
}

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {
    title: 'LumiCharge',
    body: '¡Tu pedido está en camino! 🚀',
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: 'lumicharge-notif',
      renotify: true,
      actions: [
        { action: 'track', title: '📦 Rastrear pedido' },
        { action: 'dismiss', title: 'Cerrar' },
      ],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'track') {
    clients.openWindow('/admin');
  }
});

console.info('[LumiCharge SW] v2 loaded — PWA ready');
