"use client";

import { useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Client providers. TanStack Query owns all server state and its cache is
 * persisted to IndexedDB, so previously-loaded projects are readable offline
 * and survive reloads (architecture §Offline reads). Writes made offline are
 * paused by Query's default networkMode and replayed automatically on reconnect.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            // Keep cached data around long enough to be worth persisting.
            gcTime: ONE_WEEK,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // IndexedDB-backed persister. The storage callbacks only run in the browser
  // (during restore/persist effects), so this is SSR-safe.
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: "maap-query-cache",
      storage: {
        getItem: (k) => get<string>(k).then((v) => v ?? null),
        setItem: (k, v) => set(k, v),
        removeItem: (k) => del(k),
      },
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_WEEK,
        // Bump to discard previously-persisted caches (e.g. ones holding a
        // stale paused mutation) on the next load.
        buster: "2",
        // Only persist successful reads; never cache errors. Mutations are NOT
        // persisted - a failed/paused write must not be saved and replayed on
        // every future load (that caused stray retries of stale writes).
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === "success",
          shouldDehydrateMutation: () => false,
        },
      }}
      onSuccess={() => {
        // Replay any writes that were queued while offline.
        queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
