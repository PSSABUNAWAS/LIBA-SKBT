const CACHE_NAME = "liba-v2-1-cache";
const ASSETS = [
  "./",
  "./index.html",
  "./hasil-bacaan.html",
  "./liba.css",
  "./app.js",
  "./manifest.json",
  "./images/logo-skbt.png",
  "./images/logo-ts25.png",
  "./images/logo-liba.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
