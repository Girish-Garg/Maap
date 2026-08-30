/**
 * Defaults shared by the client hooks (as a pre-load fallback) and the server
 * data layer (when a row hasn't been created yet). They mirror the column
 * defaults in prisma/schema.prisma; keep the two in step.
 */

import type { Prices } from "@/lib/types";
import type { DimensionLists } from "./types";

/** Architecture default prices, in INR/CFT. */
export const DEFAULT_PRICES: Prices = {
  frame_3_4: 320,
  patia_1_5_to_4: 420,
  patia_4_5_to_5: 520,
  patia_5_5_to_up: 620,
  pawa: 510,
};

/** Excel-derived dimension lists, mirrored from the schema defaults. */
export const DEFAULT_DIMENSIONS: DimensionLists = {
  patia_lengths_ft: [
    1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
  ],
  patia_widths_in: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  patia_thicknesses_in: [1, 1.5, 2],
  pawa_lengths_in: [12, 15, 16, 18, 21, 24, 30, 36],
  pawa_sizes: [2, 2.5, 3],
};
