const CACHE_NAME = "eatpizza-cache-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./script.js",
  "./manifest.json",
  "./PIZZA-KHOOR.png",
  "./skin1.png",
  "./skin2.png",
  "./pizza1.png",
  "./DRUG.png",
  "./weed.webp",
  "./shit.webp",
  "./bullet.png",
  "./speed.png",
  "./pizza44.png",
  "./background.mp3",
  "./1.mp3",
  "./2.mp3",
  "./3.mp3",
  "./4.mp3",
  "./5.mp3",
  "./gooz1.mp3",
  "./gameover.mp3",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// نصب
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// فعال‌سازی نسخهٔ جدید و پاک کردن کش‌های قدیمی
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
});

// پاسخ‌دهی از کش، و اگر نبود از شبکه
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req);
    })
  );
});
