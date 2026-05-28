"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Dimensions = Database["public"]["Tables"]["user_dimensions"]["Row"];
export type DimensionKey = keyof Omit<Dimensions, "user_id">;

/** Excel-derived defaults, mirrored from the migration. Fallback if the row is
 * missing (it normally exists via the new-user trigger). */
export const DEFAULT_DIMENSIONS: Omit<Dimensions, "user_id"> = {
  patia_lengths_ft: [
    1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
  ],
  patia_widths_in: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  patia_thicknesses_in: [1, 1.5, 2],
  pawa_lengths_in: [12, 15, 16, 18, 21, 24, 30, 36],
  pawa_sizes: [2, 2.5, 3],
};

/** The current user's dimension lists (the axes of every grid). */
export function useDimensions() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["user_dimensions"],
    queryFn: async (): Promise<Omit<Dimensions, "user_id">> => {
      const { data, error } = await supabase
        .from("user_dimensions")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_DIMENSIONS;
    },
  });
}

export function useUpdateDimensions() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = ["user_dimensions"];
  type Dims = Omit<Dimensions, "user_id">;

  return useMutation({
    mutationFn: async (patch: Partial<Dims>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("user_dimensions")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    // Optimistic: apply the patch to the cache immediately so consecutive
    // add/remove actions build on the latest state instead of a stale snapshot.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Dims>(key);
      if (previous) queryClient.setQueryData<Dims>(key, { ...previous, ...patch });
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
 * §Removed dimensions). RLS scopes the query to the user's own data.
 */
export async function countProjectsUsingDimension(
  key: DimensionKey,
  value: number,
): Promise<number> {
  const supabase = createClient();
  let projectIds: string[] = [];

  if (
    key === "patia_lengths_ft" ||
    key === "patia_widths_in" ||
    key === "patia_thicknesses_in"
  ) {
    const column =
      key === "patia_lengths_ft"
        ? "length_ft"
        : key === "patia_widths_in"
          ? "width_in"
          : "thickness_in";
    const { data, error } = await supabase
      .from("patia_entries")
      .select("project_id")
      .eq(column, value);
    if (error) throw error;
    projectIds = (data ?? []).map((r) => r.project_id);
  } else {
    const column = key === "pawa_lengths_in" ? "length_in" : "size_side";
    const { data, error } = await supabase
      .from("pawa_entries")
      .select("project_id")
      .eq(column, value);
    if (error) throw error;
    projectIds = (data ?? []).map((r) => r.project_id);
  }

  return new Set(projectIds).size;
}
