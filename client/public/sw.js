// Offline shell. Never caches /api (run data lives in IndexedDB). Tiles are cached only as you view them (small cap, per OSM tile policy).
const V = 'rc-shell-v1', TILES = 'rc-tiles-v1', SHELL = '/index.html';
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.add(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k !== TILES).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
async function trim(c) { const ks = await c.keys(); if (ks.length > 400) await c.delete(ks[0]); }
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (u.pathname.startsWith('/api')) return;
    if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match(SHELL))); return; }
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); } return res; })));
  } else if (u.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(caches.open(TILES).then(async (c) => { const hit = await c.match(r); const net = fetch(r).then((res) => { if (res.ok) { c.put(r, res.clone()); trim(c); } return res; }).catch(() => hit); return hit || net; }));
  }
});
