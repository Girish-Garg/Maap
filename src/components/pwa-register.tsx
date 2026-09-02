"use client";

import { useEffect } from "react";

/**
 * Registers the service worker - production only. In `next dev` a SW interferes
 * with HMR and can serve stale assets, so we skip it there entirely.
 *
 * `updateViaCache: "none"` is what stops the worker script itself from being
 * served out of the HTTP cache: without it the browser can hold sw.js for up to
 * 24 hours, so a fix to the caching strategy takes a day to reach an installed
 * app. The explicit update() then asks for a byte-check on every load, and
 * because the worker calls skipWaiting()/clients.claim(), a new version takes
 * over immediately rather than waiting for every tab to close.
 */
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // Registration failure is non-fatal; the app works without offline caching.
      });
  }, []);

  return null;
}
