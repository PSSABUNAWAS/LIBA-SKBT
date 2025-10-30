const CACHE_NAME = "liba-v2-3-cache-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./liba.css",
  "./app.js",
  "./manifest.json",
  "./modules/bm_tp.json",
  "./modules/bi_tp.json"
];
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
