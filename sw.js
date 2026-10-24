const CACHE = 'my-work-schedule-v8';
const PREFIX = 'my-work-schedule-';
const ASSETS = ['./','./index.html','./theme.js?v=8','./styles.css?v=8','./data.js?v=8','./storage.js?v=8','./app.js?v=8','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  // Keep earlier app assets for already open tabs. Prune after all clients use this version.
  event.waitUntil(self.clients.matchAll({includeUncontrolled:true}).then(async clients => {
    if (clients.length === 0) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    }
  }));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    // Serve one complete, versioned app shell. Never mix new HTML and old scripts offline.
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match('./index.html')) || fetch(event.request)));
    return;
  }
  const allowed = ASSETS.some(asset => new URL(asset,self.registration.scope).href === event.request.url);
  if (!allowed) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
