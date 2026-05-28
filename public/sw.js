/*
 * Maap service worker (architecture §Service Worker). App-shell caching so cold
 * loads and previously-visited pages work without network. Only same-origin GETs
 * are handled - Supabase API calls pass through untouched (their offline story is
 * the IndexedDB query cache + write queue, not the SW).
 */
const CACHE = "maap-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Supabase/CDN alone

  // Page navigations: network-first, fall back to cache, then the app shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("/projects")),
        ),
    );
    return;
  }

  // Build assets and icons: cache-first (they're content-hashed / static).
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
