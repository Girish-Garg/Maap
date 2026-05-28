"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Prices } from "@/lib/types";
import type { PatiaEntry, PawaEntry } from "./entries";
import { entryKeys } from "./entries";
import { priceKey } from "./prices";
import { projectKeys } from "./projects";

export type Snapshot = Database["public"]["Tables"]["project_snapshots"]["Row"];

/** Shape stored in project_snapshots.data; consumed by the restore_snapshot RPC. */
export interface SnapshotData {
  patia: {
    length_ft: number;
    width_in: number;
    thickness_in: number;
    quantity: number;
  }[];
  pawa: { length_in: number; size_side: number; quantity: number }[];
  prices: Prices;
  /** Stored so the history list can show the total without recomputing. */
  grandTotal: number;
}

export const snapshotKeys = {
  list: (projectId: string) => ["snapshots", projectId] as const,
};

export function useSnapshots(projectId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: snapshotKeys.list(projectId),
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from("project_snapshots")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Builds the snapshot JSONB from the current project data. */
export function buildSnapshotData(
  patiaEntries: PatiaEntry[],
  pawaEntries: PawaEntry[],
  prices: Prices,
  grandTotal: number,
): SnapshotData {
  return {
    patia: patiaEntries.map((e) => ({
      length_ft: e.length_ft,
      width_in: e.width_in,
      thickness_in: e.thickness_in,
      quantity: e.quantity,
    })),
    pawa: pawaEntries.map((e) => ({
      length_in: e.length_in,
      size_side: e.size_side,
      quantity: e.quantity,
    })),
    prices,
    grandTotal,
  };
}

export function useSaveSnapshot(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      label,
      data,
    }: {
      label: string | null;
      data: SnapshotData;
    }) => {
      const { error } = await supabase.from("project_snapshots").insert({
        project_id: projectId,
        label,
        data: data as unknown as Database["public"]["Tables"]["project_snapshots"]["Insert"]["data"],
      });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: snapshotKeys.list(projectId) }),
  });
}

export function useRestoreSnapshot(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const { error } = await supabase.rpc("restore_snapshot", {
        snapshot_id: snapshotId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Cell data and prices changed server-side; refetch everything.
      queryClient.invalidateQueries({ queryKey: entryKeys.patia(projectId) });
      queryClient.invalidateQueries({ queryKey: entryKeys.pawa(projectId) });
      queryClient.invalidateQueries({ queryKey: priceKey(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
