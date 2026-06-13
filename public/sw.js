const CACHE_NAME = "expense-tracker-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg"
];

// On Service Worker Installation: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline shell...");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Clean up stale or previous cache partitions on activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Destroying redundant cache partition: ", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept network queries with Stale-while-Revalidate strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  
  // Exclude third-party external calls (like accounts.google.com simulation or API key targets checking)
  if (req.method !== "GET" || req.url.includes("chrome-extension://")) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      // If found in cache, return the cached resource, but fetch update in background!
      if (cachedResponse) {
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {
            // Silently swallow offline request failures
          });
        return cachedResponse;
      }

      // If not cached, carry out standard fetch
      return fetch(req)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          return networkResponse;
        })
        .catch(() => {
          // Fallback if offline and requesting HTML main navigation
          if (req.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
