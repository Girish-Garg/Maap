"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  countProjectsUsingDimension as countProjectsUsingDimensionAction,
  getDimensions,
  updateDimensions,
} from "@/lib/server/dimensions";
import { DEFAULT_DIMENSIONS } from "@/lib/db/defaults";
import type { DimensionKey, DimensionLists } from "@/lib/db/types";

export { DEFAULT_DIMENSIONS };
export type { DimensionKey };
/** The dimension lists as the UI holds them (no owner column). */
export type Dimensions = DimensionLists;

/** The current user's dimension lists (the axes of every grid). */
export function useDimensions() {
  return useQuery({
    queryKey: ["user_dimensions"],
    queryFn: () => getDimensions(),
  });
}

export function useUpdateDimensions() {
  const queryClient = useQueryClient();
  const key = ["user_dimensions"];

  return useMutation({
    mutationFn: (patch: Partial<DimensionLists>) => updateDimensions(patch),
    // Optimistic: apply the patch to the cache immediately so consecutive
    // add/remove actions build on the latest state instead of a stale snapshot.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DimensionLists>(key);
      if (previous) {
        queryClient.setQueryData<DimensionLists>(key, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * How many of the user's projects use a given dimension value. Used to warn
 * before removing a value that's referenced by existing entries (architecture
 * §Removed dimensions). The query is scoped to the caller on the server.
 */
export function countProjectsUsingDimension(
  key: DimensionKey,
  value: number,
): Promise<number> {
  return countProjectsUsingDimensionAction(key, value);
}
