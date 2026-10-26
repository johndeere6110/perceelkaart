// Perceelkaart service worker: nodig om als app te installeren, en de app zelf werkt ook zonder bereik.
// Kaarttegels en PDOK-gegevens gaan er niet doorheen; percelen bewaart perceel.js zelf.
const CACHE = "perceelkaart-v51";
const SHELL = ["./", "./index.html", "./installeren.html", "./vendor/qrcodejs/qrcode.min.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./perceel.js",
  "./vendor/leaflet/leaflet.js", "./vendor/leaflet/leaflet.css", "./vendor/polygon-clipping/polygon-clipping.umd.min.js",
  "./fonts/barlow-latin-400-normal.woff2", "./fonts/barlow-latin-500-normal.woff2", "./fonts/barlow-latin-600-normal.woff2",
  "./fonts/barlow-semi-condensed-latin-500-normal.woff2", "./fonts/barlow-semi-condensed-latin-700-normal.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  // Alleen eigen oude caches opruimen: de Zaaihulp staat op hetzelfde domein
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("perceelkaart-") && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Eigen bestanden: eerst netwerk (altijd de nieuwste versie), anders uit de cache
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache", redirect: e.request.mode === "navigate" ? "manual" : "follow" })
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(m => m || caches.match("./index.html")))
  );
});
