/*
 * Maap service worker (architecture §Service Worker). App-shell caching so cold
 * loads and previously-visited pages work without network.
 *
 * Update strategy - this is the part that matters:
 *
 * Navigations are network-first. An earlier version served them
 * stale-while-revalidate, which combined badly with cache-first build assets:
 * the cached HTML referenced the previous build's /_next/ hashes, those were
 * served from cache too, and the app stayed pinned to an old version. Because
 * this file's bytes did not change between deploys, the browser never saw a new
 * worker, so the activate handler that clears caches never ran - and the only
 * way out was reinstalling the app.
 *
 * Network-first navigation breaks that loop: fresh HTML always names the new
 * build's assets, those miss the cache, and get fetched. Build assets stay
 * cache-first, which is safe precisely because their filenames are
 * content-hashed - a cached entry is never a stale version of anything.
 */
const CACHE = "maap-v4";

/** Paths whose responses must never be cached (auth callbacks return transient
 *  redirects; caching one stale redirect bricks future sign-ins). */
function isUncacheable(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/login"
  );
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
  if (url.origin !== self.location.origin) return;

  // Auth flows and API routes: always the network. /api/logo in particular is
  // per-user and versioned by the caller, so it must never be served to a
  // different session from cache.
  if (isUncacheable(url.pathname)) {
    event.respondWith(fetch(req));
    return;
  }

  // Page navigations: network-first. The network copy is authoritative and is
  // written back to the cache; the cache is only read when the fetch fails,
  // which is what keeps the app usable offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Never cache redirects or error responses - that's how a bad auth
          // redirect could poison the cache.
          if (res.ok && !res.redirected && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/projects"))),
    );
    return;
  }

  // Build assets and icons: cache-first. Their URLs are content-hashed, so a
  // hit is always the right bytes and a new build simply misses.
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
