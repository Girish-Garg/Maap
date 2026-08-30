"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPatiaEntries,
  listPawaEntries,
  setPatiaCell,
  setPawaCell,
} from "@/lib/server/entries";
import type {
  PatiaCoords,
  PatiaEntry,
  PawaCoords,
  PawaEntry,
} from "@/lib/db/types";

export type { PatiaEntry, PawaEntry };

export const entryKeys = {
  patia: (projectId: string) => ["patia_entries", projectId] as const,
  pawa: (projectId: string) => ["pawa_entries", projectId] as const,
};

export function usePatiaEntries(projectId: string) {
  return useQuery({
    queryKey: entryKeys.patia(projectId),
    queryFn: () => listPatiaEntries(projectId),
  });
}

export function usePawaEntries(projectId: string) {
  return useQuery({
    queryKey: entryKeys.pawa(projectId),
    queryFn: () => listPawaEntries(projectId),
  });
}

const samePatia = (a: PatiaCoords) => (e: PatiaEntry) =>
  e.length_ft === a.length_ft &&
  e.width_in === a.width_in &&
  e.thickness_in === a.thickness_in;

const samePawa = (a: PawaCoords) => (e: PawaEntry) =>
  e.length_in === a.length_in && e.size_side === a.size_side;

/**
 * Sets a Patia cell's quantity with optimistic UI (architecture.md §write flow).
 * Quantity 0 deletes the cell so empty cells stay genuinely empty (design §6.3).
 * On failure the cache rolls back to its previous snapshot and the caller shows
 * an error toast. Writes are idempotent via the cell's unique constraint.
 */
export function useSetPatiaCell(projectId: string) {
  const queryClient = useQueryClient();
  const key = entryKeys.patia(projectId);

  return useMutation({
    mutationFn: ({
      coords,
      quantity,
    }: {
      coords: PatiaCoords;
      quantity: number;
    }) => setPatiaCell(projectId, coords, quantity),
    onMutate: async ({ coords, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PatiaEntry[]>(key) ?? [];
      const without = previous.filter((e) => !samePatia(coords)(e));
      const next =
        quantity > 0
          ? [...without, { id: "optimistic", project_id: projectId, ...coords, quantity }]
          : without;
      queryClient.setQueryData<PatiaEntry[]>(key, next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Pawa equivalent of {@link useSetPatiaCell}. */
export function useSetPawaCell(projectId: string) {
  const queryClient = useQueryClient();
  const key = entryKeys.pawa(projectId);

  return useMutation({
    mutationFn: ({
      coords,
      quantity,
    }: {
      coords: PawaCoords;
      quantity: number;
    }) => setPawaCell(projectId, coords, quantity),
    onMutate: async ({ coords, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PawaEntry[]>(key) ?? [];
      const without = previous.filter((e) => !samePawa(coords)(e));
      const next =
        quantity > 0
          ? [...without, { id: "optimistic", project_id: projectId, ...coords, quantity }]
          : without;
      queryClient.setQueryData<PawaEntry[]>(key, next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
