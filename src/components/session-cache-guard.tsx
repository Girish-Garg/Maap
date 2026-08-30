"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CACHE_OWNER_KEY, clearQueryCache } from "@/lib/query-cache";

/**
 * Throws away the persisted query cache when the signed-in user changes.
 *
 * The cache is restored from IndexedDB before any query runs, so on a shared
 * browser the previous account's projects would be on screen the moment the
 * next person signed in. Comparing the cache's recorded owner against the
 * current session catches that, including when the previous session simply
 * expired rather than being signed out of.
 */
export function SessionCacheGuard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let owner: string | null = null;
    try {
      owner = localStorage.getItem(CACHE_OWNER_KEY);
    } catch {
      // Storage unavailable: fall through and clear, which is the safe side.
    }
    if (owner === userId) return;

    void clearQueryCache(queryClient).then(() => {
      try {
        localStorage.setItem(CACHE_OWNER_KEY, userId);
      } catch {
        // Nothing to record; the next load simply clears again.
      }
    });
  }, [queryClient, userId]);

  return null;
}
