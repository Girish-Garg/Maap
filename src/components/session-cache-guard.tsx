"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { del } from "idb-keyval";
import { CACHE_OWNER_KEY, QUERY_CACHE_KEY } from "@/lib/query-cache";

/**
 * Throws away the persisted query cache when the signed-in user changes.
 *
 * The cache is restored from IndexedDB before any query runs, so on a shared
 * browser the previous account's projects would be on screen the moment the
 * next person signed in. Comparing the cache's recorded owner against the
 * current session catches that, including when the previous session simply
 * expired rather than being signed out of.
 *
 * The order below matters. Clearing memory and recording the new owner both
 * happen synchronously, and only then is the copy on disk removed, without
 * being waited on. Recording the owner after an awaited delete meant that a
 * delete which stalled or threw left the owner unset - so every later load
 * cleared the cache again and cancelled its own in-flight queries, leaving the
 * app stuck on its loading placeholders.
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

    // Memory first: this is the copy that would otherwise reach the screen.
    queryClient.clear();

    try {
      localStorage.setItem(CACHE_OWNER_KEY, userId);
    } catch {
      // Without this the next load clears again - correct, just wasteful.
    }

    // Best effort. The cleared cache is re-persisted empty over the top of it
    // anyway, so a failure here cannot resurrect the previous user's data.
    void del(QUERY_CACHE_KEY).catch(() => {});
  }, [queryClient, userId]);

  return null;
}
