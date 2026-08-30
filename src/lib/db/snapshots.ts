"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSnapshots,
  restoreSnapshot,
  saveSnapshot,
} from "@/lib/server/snapshots";
import type { PatiaEntry, PawaEntry, Snapshot, SnapshotData } from "@/lib/db/types";
import type { Prices } from "@/lib/types";
import { entryKeys } from "./entries";
import { priceKey } from "./prices";
import { projectKeys } from "./projects";

export type { Snapshot, SnapshotData };

export const snapshotKeys = {
  list: (projectId: string) => ["snapshots", projectId] as const,
};

export function useSnapshots(projectId: string) {
  return useQuery({
    queryKey: snapshotKeys.list(projectId),
    queryFn: () => listSnapshots(projectId),
  });
}

/** Builds the snapshot payload from the current project data. */
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      label,
      data,
    }: {
      label: string | null;
      data: SnapshotData;
    }) => saveSnapshot(projectId, label, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: snapshotKeys.list(projectId) }),
  });
}

export function useRestoreSnapshot(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshotId: string) => restoreSnapshot(snapshotId),
    onSuccess: () => {
      // Cell data and prices changed server-side; refetch everything.
      queryClient.invalidateQueries({ queryKey: entryKeys.patia(projectId) });
      queryClient.invalidateQueries({ queryKey: entryKeys.pawa(projectId) });
      queryClient.invalidateQueries({ queryKey: priceKey(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
