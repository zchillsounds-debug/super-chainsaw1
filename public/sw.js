// Offline cache for the installed app: the game shell is cached on install, everything else on first use.
const CACHE = 'sob-v2';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const url = new URL(r.url);
  const ok = url.origin === location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!ok) return;
  // network first for the page itself (so updates arrive), cache first for assets and fonts
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); return res; }).catch(() => caches.match(r).then((m) => m || caches.match('./index.html')))); return; }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; })));
});
