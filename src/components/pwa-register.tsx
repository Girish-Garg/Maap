"use client";

import { useEffect } from "react";

/**
 * Registers the service worker - production only. In `next dev` a SW interferes
 * with HMR and can serve stale assets, so we skip it there entirely.
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
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure is non-fatal; the app works without offline caching.
    });
  }, []);

  return null;
}
