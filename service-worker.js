const CACHE_NAME = "eat-pizza-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./pizzaback.jpg",
  "./PIZZA-KHOOR.png",
  "./pizza1.png",
  "./DRUG.png",
  "./weed.webp",
  "./shit.webp",
  "./bullet.png",
  "./speed.png",
  "./avatar1.png",
  "./avatar2.png",
  "./avatar3.png",
  "./avatar4.png",
  "./background.mp3",
  "./1.mp3",
  "./2.mp3",
  "./3.mp3",
  "./4.mp3",
  "./5.mp3",
  "./weed.mp3",
  "./gooz1.mp3",
  "./gameover.mp3",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
