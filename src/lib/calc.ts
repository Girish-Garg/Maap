/**
 * lib/calc.ts - the frozen calculation contract.
 *
 * Pure, dependency-free functions that replicate the source Excel workbook
 * exactly. Verified cell-by-cell against "Copy of Wood Measurement.xlsx":
 *
 *   Patia per cell (Cal Sheet K3): length_ft * thickness_in * width_in * qty
 *     then divided by 144 during aggregation (Summary C4: SUM(...)/144).
 *   Frame bucket (Cal Sheet K20: SUM of width 3 & 4 rows): width_in in {3, 4}.
 *   Length buckets apply only to non-Frame Patia (Summary B4/B5/B6):
 *     <= 4ft, 4.5-5ft, 5.5ft+.
 *   Pawa per cell (Summary L5 array formula):
 *     length_in * qty * size_side^2, then /12/144 == /1728.
 *   Grand total (Summary E11..E15, E16): sum of bucket CFT * bucket rate.
 *
 * Client trust depends on this staying correct, so nothing here rounds:
 * full float precision is preserved end-to-end and rounding is a display concern.
 */

import type {
  BucketResult,
  PatiaEntry,
  PawaEntry,
  PatiaLengthBucket,
  Prices,
  ProjectSummary,
} from "./types";

/** Cubic inches per cubic foot for plank volume (12 * 12, width*thickness in inches, length in feet). */
const PATIA_DIVISOR = 144;
/** Cubic inches per cubic foot for post volume (12 * 12 * 12, all dimensions in inches). */
const PAWA_DIVISOR = 1728;

/** Widths (in inches) that bill as Frame rather than by length. */
const FRAME_WIDTHS = new Set([3, 4]);

/** Upper length bound (ft) of the first non-Frame Patia bucket. */
const BUCKET_1_MAX_FT = 4;
/** Upper length bound (ft) of the second non-Frame Patia bucket. */
const BUCKET_2_MAX_FT = 5;

/**
 * Rejects values that the Excel sheet could never produce: negatives and
 * non-finite numbers. Quantities of 0 are valid (an empty cell).
 */
function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number, got: ${value}`);
  }
}

/** Volume of one Patia cell in cubic feet. */
export function patiaCFT(entry: PatiaEntry): number {
  assertNonNegativeFinite(entry.length_ft, "length_ft");
  assertNonNegativeFinite(entry.width_in, "width_in");
  assertNonNegativeFinite(entry.thickness_in, "thickness_in");
  assertNonNegativeFinite(entry.quantity, "quantity");
  return (entry.quantity * entry.width_in * entry.thickness_in * entry.length_ft) / PATIA_DIVISOR;
}

/** Volume of one Pawa cell in cubic feet (square cross-section). */
export function pawaCFT(entry: PawaEntry): number {
  assertNonNegativeFinite(entry.length_in, "length_in");
  assertNonNegativeFinite(entry.size_side, "size_side");
  assertNonNegativeFinite(entry.quantity, "quantity");
  return (entry.quantity * entry.size_side * entry.size_side * entry.length_in) / PAWA_DIVISOR;
}

/** A Patia entry bills as Frame when its width is 3" or 4". */
export function isFrame(entry: PatiaEntry): boolean {
  return FRAME_WIDTHS.has(entry.width_in);
}

/**
 * The length bucket a non-Frame Patia entry falls into.
 * Boundaries are inclusive of the upper bound, matching the Excel ranges
 * "1.5 to 4", "4.5 to 5", "5.5 and up".
 */
export function lengthBucket(lengthFt: number): PatiaLengthBucket {
  if (lengthFt <= BUCKET_1_MAX_FT) return "patia_1_5_to_4";
  if (lengthFt <= BUCKET_2_MAX_FT) return "patia_4_5_to_5";
  return "patia_5_5_to_up";
}

/**
 * Aggregates all entries into the five billing buckets and the grand total.
 * Frame and length buckets are mutually exclusive: a Frame entry never also
 * counts toward a length bucket (the Excel sheet sums them on separate rows).
 */
export function calculateSummary(
  patiaEntries: readonly PatiaEntry[],
  pawaEntries: readonly PawaEntry[],
  prices: Prices,
): ProjectSummary {
  const cft = {
    frame_3_4: 0,
    patia_1_5_to_4: 0,
    patia_4_5_to_5: 0,
    patia_5_5_to_up: 0,
    pawa: 0,
  };

  for (const entry of patiaEntries) {
    const volume = patiaCFT(entry);
    if (isFrame(entry)) {
      cft.frame_3_4 += volume;
    } else {
      cft[lengthBucket(entry.length_ft)] += volume;
    }
  }

  for (const entry of pawaEntries) {
    cft.pawa += pawaCFT(entry);
  }

  const toBucket = (volume: number, rate: number): BucketResult => ({
    cft: volume,
    rate,
    total: volume * rate,
  });

  const summary: Omit<ProjectSummary, "totalCFT" | "grandTotal"> = {
    frame_3_4: toBucket(cft.frame_3_4, prices.frame_3_4),
    patia_1_5_to_4: toBucket(cft.patia_1_5_to_4, prices.patia_1_5_to_4),
    patia_4_5_to_5: toBucket(cft.patia_4_5_to_5, prices.patia_4_5_to_5),
    patia_5_5_to_up: toBucket(cft.patia_5_5_to_up, prices.patia_5_5_to_up),
    pawa: toBucket(cft.pawa, prices.pawa),
  };

  const buckets = Object.values(summary);
  const totalCFT = buckets.reduce((sum, b) => sum + b.cft, 0);
  const grandTotal = buckets.reduce((sum, b) => sum + b.total, 0);

  return { ...summary, totalCFT, grandTotal };
}
