"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { PatiaCoords, PawaCoords } from "@/lib/store";

export type PatiaEntry = Database["public"]["Tables"]["patia_entries"]["Row"];
export type PawaEntry = Database["public"]["Tables"]["pawa_entries"]["Row"];

export const entryKeys = {
  patia: (projectId: string) => ["patia_entries", projectId] as const,
  pawa: (projectId: string) => ["pawa_entries", projectId] as const,
};

export function usePatiaEntries(projectId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: entryKeys.patia(projectId),
    queryFn: async (): Promise<PatiaEntry[]> => {
      const { data, error } = await supabase
        .from("patia_entries")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });
}

export function usePawaEntries(projectId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: entryKeys.pawa(projectId),
    queryFn: async (): Promise<PawaEntry[]> => {
      const { data, error } = await supabase
        .from("pawa_entries")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
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
 * an error toast. Upserts are idempotent via the cell's unique constraint.
 */
export function useSetPatiaCell(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = entryKeys.patia(projectId);

  return useMutation({
    mutationFn: async ({
      coords,
      quantity,
    }: {
      coords: PatiaCoords;
      quantity: number;
    }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from("patia_entries")
          .delete()
          .match({ project_id: projectId, ...coords });
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("patia_entries")
        .upsert(
          { project_id: projectId, ...coords, quantity },
          { onConflict: "project_id,length_ft,width_in,thickness_in" },
        );
      if (error) throw error;
    },
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
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = entryKeys.pawa(projectId);

  return useMutation({
    mutationFn: async ({
      coords,
      quantity,
    }: {
      coords: PawaCoords;
      quantity: number;
    }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from("pawa_entries")
          .delete()
          .match({ project_id: projectId, ...coords });
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("pawa_entries")
        .upsert(
          { project_id: projectId, ...coords, quantity },
          { onConflict: "project_id,length_in,size_side" },
        );
      if (error) throw error;
    },
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
