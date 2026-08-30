"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPrices, updatePrices } from "@/lib/server/prices";
import { DEFAULT_PRICES } from "@/lib/db/defaults";
import type { Prices } from "@/lib/types";

export { DEFAULT_PRICES };

export const priceKey = (projectId: string) => ["price_config", projectId] as const;

export function usePrices(projectId: string) {
  return useQuery({
    queryKey: priceKey(projectId),
    queryFn: () => getPrices(projectId),
  });
}

export function useUpdatePrices(projectId: string) {
  const queryClient = useQueryClient();
  const key = priceKey(projectId);

  return useMutation({
    mutationFn: (prices: Prices) => updatePrices(projectId, prices),
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
