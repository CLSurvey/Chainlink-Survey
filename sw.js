/* ChainLink Survey Assistant — service worker
   Strategy:
   - Navigations (the app itself): NETWORK FIRST, falling back to cache.
     New versions always win when online; the app still opens with no signal.
   - Fonts/static assets: cache first (they never change).
   - Satellite/topo basemap tiles (Esri, USGS): CACHE FIRST with a size cap.
     Any tile viewed once is available offline afterward; the in-app
     "Cache area for offline" button pre-warms this cache deliberately.
   Deploy this file alongside the app HTML at the site root. */

const CACHE = "chainlink-shell-v1";
const TILES = "chainlink-tiles-v1";
const TILE_HOSTS = ["server.arcgisonline.com", "basemap.nationalmap.gov"];
const TILE_CAP = 4000; // ~60-120 MB; oldest entries evicted beyond this

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function tileFetch(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) {
    cache.put(req, res.clone());
    // Soft LRU: evict oldest entries past the cap (keys() is insertion order)
    cache.keys().then(keys => {
      if (keys.length > TILE_CAP) {
        keys.slice(0, keys.length - TILE_CAP).forEach(k => cache.delete(k));
      }
    });
  }
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // App shell — network first, cache fallback
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  const url = new URL(req.url);

  // Basemap tiles — cache first so viewed areas work offline
  if (TILE_HOSTS.some(h => url.hostname.includes(h))) {
    e.respondWith(tileFetch(req).catch(() => caches.match(req)));
    return;
  }

  // Fonts and other static assets — cache first, then network
  if (url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
      )
    );
  }
});
