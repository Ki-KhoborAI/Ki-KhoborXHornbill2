const CACHE_NAME = "ki-khobor-shell-v3";
const CACHE_PREFIX = "ki-khobor-shell-";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // If this fails, installation is rejected and the active worker/cache stay usable.
      const cache = await caches.open(CACHE_NAME);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const currentCache = await caches.open(CACHE_NAME);
      const oldCaches = (await caches.keys()).filter(
        (key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME
      );

      // Keep previously visited pages/assets when the cache version changes.
      for (const oldName of oldCaches) {
        const oldCache = await caches.open(oldName);
        let migrationSucceeded = true;

        for (const request of await oldCache.keys()) {
          try {
            const response = await oldCache.match(request);
            if (response) await currentCache.put(request, response);
          } catch {
            migrationSucceeded = false;
          }
        }

        // Never discard the old working cache if migration was incomplete.
        if (migrationSucceeded) await caches.delete(oldName);
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // These responses are data/protocol payloads, never HTML documents.
  if (
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/") ||
    url.searchParams.has("_rsc") ||
    request.headers.has("RSC") ||
    request.headers.get("Accept")?.includes("text/x-component")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          const contentType = response.headers.get("Content-Type") ?? "";

          // Save successful, query-free HTML navigations (including visited Morungs).
          if (response.ok && !url.search && contentType.includes("text/html")) {
            try {
              await cache.put(request, response.clone());
            } catch {
              // A cache quota/write issue should not break the online navigation.
            }
          }
          return response;
        } catch {
          const cachedPage = await cache.match(request);
          if (cachedPage) return cachedPage;

          const fallback = await cache.match(OFFLINE_URL);
          return (
            fallback ||
            new Response("You are offline. Please reconnect and try again.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  const isStaticAsset = ["script", "style", "font", "image"].includes(
    request.destination
  );

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          if (response.ok && response.type === "basic") {
            try {
              await cache.put(request, response.clone());
            } catch {
              // Preserve the network response if storage is unavailable.
            }
          }
          return response;
        } catch {
          return (
            (await cache.match(request)) ||
            new Response("", { status: 503 })
          );
        }
      })()
    );
  }
});
