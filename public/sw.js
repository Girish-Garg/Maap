/*
 * Maap service worker (architecture §Service Worker). App-shell caching so cold
 * loads and previously-visited pages work without network. Only same-origin GETs
 * are handled - Supabase API calls pass through untouched (their offline story is
 * the IndexedDB query cache + write queue, not the SW).
 *
 * Bumping CACHE busts every previously-cached response on activation, which is
 * how we recover from a poisoned redirect being cached.
 */
const CACHE = "maap-v2";

/** Paths whose responses must never be cached (auth callbacks return transient
 *  redirects; caching one stale redirect bricks future sign-ins). */
function isUncacheable(pathname) {
  return pathname.startsWith("/auth/") || pathname === "/login";
}

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

  // Auth flows: always go to the network, never read or write the cache.
  if (isUncacheable(url.pathname)) {
    event.respondWith(fetch(req));
    return;
  }

  // Page navigations: network-first, fall back to cache, then the app shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only cache successful, non-redirect responses; never store a 3xx
          // that could send the next visitor somewhere wrong.
          if (res.ok && !res.redirected && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
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
    url.pathname === "/favicon.svg" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
