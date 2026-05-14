const CACHE_NAME = "sahseh-pwa-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/assets/logo.png",
  "/assets/logo-light.png",
  "/icons/apple-touch-icon-152.png",
  "/icons/apple-touch-icon-167.png",
  "/icons/pwa-192.png",
  "/icons/pwa-512.png",
];

const isApiRequest = (url) => url.pathname.startsWith("/api/");
const isSafeRequest = (request) => request.method === "GET";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || !isSafeRequest(request) || isApiRequest(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          return response;
        })
        .catch(() => caches.match("/") || new Response("Offline", { status: 503 })),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
