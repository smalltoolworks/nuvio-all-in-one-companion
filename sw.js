/* Nuvio Companion service worker — offline app shell + cached community packs.
   Never touches cross-origin requests (Nuvio cloud API, addon manifests, images). */
const CACHE = 'nuvio-companion-v12';
const DATA_CACHE = 'nuvio-companion-data-v1'; // written by the page (community packs); must survive shell upgrades
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './favicon.ico'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== DATA_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req, fallbackPath){
  return fetch(req)
    .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
    .catch(() => caches.match(req).then(c => c || (fallbackPath ? caches.match(fallbackPath) : Response.error())));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave API / manifests / images alone

  if (url.pathname.endsWith('/community-packs.json')) { e.respondWith(networkFirst(req)); return; }
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, './index.html')); return; }
  e.respondWith(caches.match(req).then(c => c || fetch(req)));
});
