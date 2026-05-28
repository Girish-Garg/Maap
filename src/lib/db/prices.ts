"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Prices } from "@/lib/types";

type PriceRow = Database["public"]["Tables"]["price_configs"]["Row"];

export const priceKey = (projectId: string) => ["price_config", projectId] as const;

/** Strips the project_id off a price row to get the calc-ready {@link Prices}. */
function toPrices(row: PriceRow): Prices {
  return {
    frame_3_4: row.frame_3_4,
    patia_1_5_to_4: row.patia_1_5_to_4,
    patia_4_5_to_5: row.patia_4_5_to_5,
    patia_5_5_to_up: row.patia_5_5_to_up,
    pawa: row.pawa,
  };
}

/** Architecture default prices, used as a fallback before the row loads. */
export const DEFAULT_PRICES: Prices = {
  frame_3_4: 320,
  patia_1_5_to_4: 420,
  patia_4_5_to_5: 520,
  patia_5_5_to_up: 620,
  pawa: 510,
};

export function usePrices(projectId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: priceKey(projectId),
    queryFn: async (): Promise<Prices> => {
      const { data, error } = await supabase
        .from("price_configs")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data ? toPrices(data) : DEFAULT_PRICES;
    },
  });
}

export function useUpdatePrices(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const key = priceKey(projectId);

  return useMutation({
    mutationFn: async (prices: Prices) => {
      const { error } = await supabase
        .from("price_configs")
        .upsert({ project_id: projectId, ...prices }, { onConflict: "project_id" });
      if (error) throw error;
    },
    onMutate: async (prices) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Prices>(key);
      queryClient.setQueryData<Prices>(key, prices);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
