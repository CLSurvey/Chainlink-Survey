/* ChainLink Survey Assistant — service worker
   Strategy:
   - Navigations (the app itself): NETWORK FIRST WITH A TIMEOUT, falling back
     to cache. New versions win when online; on one bar of LTE the app still
     opens in a couple of seconds instead of hanging on a request that will
     never fail outright.
   - Fonts and third-party libraries (OCR, PDF): cache first, in a durable
     cache. The browser HTTP cache is evictable; these are not.
   - Basemap tiles (Esri, Esri Wayback, USGS): CACHE FIRST with a size cap.
     Any tile viewed once is available offline afterward. Tiles fetched during
     a deliberate "Cache area for offline" run go to a separate PINNED cache
     that the cap never evicts.
   Deploy this file alongside the app HTML at the site root. */

const CACHE  = "chainlink-shell-v2";
const TILES  = "chainlink-tiles-v2";
const PINNED = "chainlink-tiles-pinned-v1";
const LIBS   = "chainlink-libs-v1";
const KEEP   = [CACHE, TILES, PINNED, LIBS];

/* wayback.maptiles.arcgis.com serves the historical imagery basemap. It was
   missing from this list, so nothing on a Wayback release ever cached and the
   pre-warm button silently did nothing while one was selected. */
const TILE_HOSTS = [
  "server.arcgisonline.com",
  "basemap.nationalmap.gov",
  "wayback.maptiles.arcgis.com",
  "clarity.maptiles.arcgis.com"
];

/* tesseract.js and pdf.js are loaded from a CDN at first use. The script tag
   is only part of it — tesseract also pulls a WASM core and an ~11 MB
   language pack, sometimes from a different host. All of them are cached
   here so "cached after that" is actually true offline. */
const LIB_HOSTS = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "tessdata.projectnaptha.com"
];

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const TILE_CAP = 4000;      // ~60-120 MB of ordinary browsing
const NAV_TIMEOUT = 2500;   // ms before falling back to the cached shell

let _pinTiles = false;      // set by the app around a deliberate pre-warm

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* The app posts {type:"PIN_TILES", on:true} before a pre-warm run and
   {on:false} after, so a deliberately cached area is not the first thing
   evicted the next time you pan somewhere else. Absent the message the
   worker behaves exactly as before. */
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "PIN_TILES") _pinTiles = !!d.on;
  if (d.type === "SKIP_WAITING") self.skipWaiting();
});

function isHost(url, list) {
  return list.some(h => url.hostname === h || url.hostname.endsWith("." + h));
}

/* Cache first, and keep what we store. Used for fonts and for the OCR/PDF
   libraries, none of which change under a fixed version URL. */
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) {
    try { await cache.put(req, res.clone()); } catch (e) {}
  }
  return res;
}

async function tileFetch(req) {
  const pinned = await caches.open(PINNED);
  const pinHit = await pinned.match(req);
  if (pinHit) return pinHit;

  const cache = await caches.open(TILES);
  const hit = await cache.match(req);
  if (hit) return hit;

  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) {
    const target = _pinTiles ? pinned : cache;
    try { await target.put(req, res.clone()); } catch (e) {}
    if (!_pinTiles) await trimTiles(cache);
  }
  return res;
}

/* Insertion-order eviction (keys() is insertion order, so this is FIFO rather
   than true LRU). Awaited by the caller so it cannot be cut short when the
   worker is terminated mid-run. Pinned tiles are in a different cache and are
   never touched. */
async function trimTiles(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= TILE_CAP) return;
    const excess = keys.slice(0, keys.length - TILE_CAP);
    await Promise.all(excess.map(k => cache.delete(k)));
  } catch (e) {}
}

/* A slow network is not a failed one. Without a timeout the app sits on a
   pending navigation until the request finally gives up — the exact
   behaviour you do not want at the end of a dirt road. The network copy is
   still written to the cache if it arrives after the fallback. */
function navigate(req) {
  const net = fetch(req).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    return res;
  });

  const fallback = () => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || caches.match("./", { ignoreSearch: true }))
    .then(hit => hit || caches.match("/index.html", { ignoreSearch: true }))
    .then(hit => hit || new Response(
      "<h1>Offline</h1><p>ChainLink has not been cached on this device yet. " +
      "Open the app once with a connection.</p>",
      { headers: { "Content-Type": "text/html" }, status: 503 }
    ));

  return new Promise(resolve => {
    let settled = false;
    const done = r => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => fallback().then(done), NAV_TIMEOUT);
    net.then(res => { clearTimeout(timer); done(res); })
       .catch(() => { clearTimeout(timer); fallback().then(done); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") { e.respondWith(navigate(req)); return; }

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  if (isHost(url, TILE_HOSTS)) {
    e.respondWith(
      tileFetch(req).catch(() =>
        caches.match(req).then(hit => hit || Response.error()))
    );
    return;
  }

  if (isHost(url, LIB_HOSTS)) {
    e.respondWith(
      cacheFirst(req, LIBS).catch(() =>
        caches.match(req).then(hit => hit || Response.error()))
    );
    return;
  }

  if (isHost(url, FONT_HOSTS)) {
    e.respondWith(
      cacheFirst(req, CACHE).catch(() =>
        caches.match(req).then(hit => hit || Response.error()))
    );
    return;
  }

  /* Everything else — same-origin assets, NGS and elevation APIs — goes
     straight to the network. Those are live queries; caching them would
     hand back stale answers. */
});
