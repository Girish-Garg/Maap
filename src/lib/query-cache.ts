"use client";

import type { QueryClient } from "@tanstack/react-query";
import { del } from "idb-keyval";

/**
 * The offline query cache is written to IndexedDB, which outlives a session.
 * That is what makes previously-loaded projects readable offline - and also
 * what makes it another user's problem if the browser is shared: without the
 * clearing below, signing in as someone else would show the previous account's
 * project list, and `staleTime` means it would be displayed without even
 * refetching first.
 */

/** IndexedDB key holding the persisted cache (see components/providers.tsx). */
export const QUERY_CACHE_KEY = "maap-query-cache";

/** Who the cache on this device belongs to, so a change of user is detectable. */
export const CACHE_OWNER_KEY = "maap-cache-owner";

/** Drops the in-memory cache and the copy on disk. */
export async function clearQueryCache(queryClient: QueryClient): Promise<void> {
  queryClient.clear();
  try {
    localStorage.removeItem(CACHE_OWNER_KEY);
  } catch {
    // Private mode or blocked storage: nothing to forget.
  }
  try {
    await del(QUERY_CACHE_KEY);
  } catch {
    // Same: an unreadable store holds nothing to leak.
  }
}
