/**
 * Domain types shared across the calculation module, the data layer, and the UI.
 * Field names mirror the Postgres schema in architecture.md so the same shape
 * flows from `supabase-js` rows straight into `lib/calc.ts` without mapping.
 */

/** One filled cell of the Patia grid: a plank of given length/width/thickness. */
export interface PatiaEntry {
  /** Length in feet (e.g. 1.5, 2, ... 10). */
  length_ft: number;
  /** Width in inches (e.g. 3 ... 18). Width 3 or 4 makes this a Frame entry. */
  width_in: number;
  /** Thickness in inches (e.g. 1, 1.5, 2). */
  thickness_in: number;
  /** Count of planks at this dimension. Non-negative integer. */
  quantity: number;
}

/** One filled cell of the Pawa grid: a square-section post. */
export interface PawaEntry {
  /** Length in inches (e.g. 12, 15, ... 36). */
  length_in: number;
  /** Side of the square cross-section in inches (e.g. 2, 2.5, 3). */
  size_side: number;
  /** Count of posts at this dimension. Non-negative integer. */
  quantity: number;
}

/**
 * Per-project prices in INR per cubic foot, one per billing bucket.
 * Keys match `price_configs` columns and the bucket ids below.
 */
export interface Prices {
  frame_3_4: number;
  patia_1_5_to_4: number;
  patia_4_5_to_5: number;
  patia_5_5_to_up: number;
  pawa: number;
}

/** The five billing buckets, keyed identically to {@link Prices}. */
export type BucketId = keyof Prices;

/** Length-based Patia buckets (Frame is width-based, handled separately). */
export type PatiaLengthBucket =
  | "patia_1_5_to_4"
  | "patia_4_5_to_5"
  | "patia_5_5_to_up";

/** One line of the summary: volume, the rate applied, and their product. */
export interface BucketResult {
  /** Volume in cubic feet (CFT), full precision. */
  cft: number;
  /** INR per CFT applied to this bucket. */
  rate: number;
  /** cft * rate, in INR, full precision. */
  total: number;
}

/** The complete calculated summary for a project. Mirrors the Summary screen. */
export interface ProjectSummary {
  frame_3_4: BucketResult;
  patia_1_5_to_4: BucketResult;
  patia_4_5_to_5: BucketResult;
  patia_5_5_to_up: BucketResult;
  pawa: BucketResult;
  /** Sum of all bucket CFT. */
  totalCFT: number;
  /** Sum of all bucket totals, in INR. The headline number. */
  grandTotal: number;
}
