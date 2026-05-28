import { describe, it, expect } from "vitest";
import {
  patiaCFT,
  pawaCFT,
  isFrame,
  lengthBucket,
  calculateSummary,
} from "./calc";
import type { PatiaEntry, PawaEntry, Prices } from "./types";

/** Architecture default prices (price_configs defaults), used across tests. */
const PRICES: Prices = {
  frame_3_4: 320,
  patia_1_5_to_4: 420,
  patia_4_5_to_5: 520,
  patia_5_5_to_up: 620,
  pawa: 510,
};

const patia = (
  length_ft: number,
  width_in: number,
  thickness_in: number,
  quantity: number,
): PatiaEntry => ({ length_ft, width_in, thickness_in, quantity });

const pawa = (
  length_in: number,
  size_side: number,
  quantity: number,
): PawaEntry => ({ length_in, size_side, quantity });

describe("patiaCFT", () => {
  it("computes qty * width * thickness * length / 144", () => {
    // 12 * 5 * 2 * 3 / 144 = 360 / 144 = 2.5
    expect(patiaCFT(patia(3, 5, 2, 12))).toBe(2.5);
  });

  it("returns 0 when quantity is 0", () => {
    expect(patiaCFT(patia(3, 5, 2, 0))).toBe(0);
  });

  it.each([
    ["length_ft", patia(-1, 5, 2, 1)],
    ["width_in", patia(3, -5, 2, 1)],
    ["thickness_in", patia(3, 5, -2, 1)],
    ["quantity", patia(3, 5, 2, -1)],
  ])("throws on negative %s", (_label, entry) => {
    expect(() => patiaCFT(entry)).toThrow(RangeError);
  });

  it("throws on non-finite input", () => {
    expect(() => patiaCFT(patia(Infinity, 5, 2, 1))).toThrow(RangeError);
    expect(() => patiaCFT(patia(3, NaN, 2, 1))).toThrow(RangeError);
  });
});

describe("pawaCFT", () => {
  it("computes qty * size^2 * length / 1728", () => {
    // 10 * 3 * 3 * 36 / 1728 = 3240 / 1728 = 1.875
    expect(pawaCFT(pawa(36, 3, 10))).toBe(1.875);
  });

  it("returns 0 when quantity is 0", () => {
    expect(pawaCFT(pawa(36, 3, 0))).toBe(0);
  });

  it.each([
    ["length_in", pawa(-36, 3, 1)],
    ["size_side", pawa(36, -3, 1)],
    ["quantity", pawa(36, 3, -1)],
  ])("throws on negative %s", (_label, entry) => {
    expect(() => pawaCFT(entry)).toThrow(RangeError);
  });

  it("throws on non-finite input", () => {
    expect(() => pawaCFT(pawa(36, 3, Infinity))).toThrow(RangeError);
  });
});

describe("isFrame", () => {
  it("is true for width 3 and 4", () => {
    expect(isFrame(patia(3, 3, 1, 1))).toBe(true);
    expect(isFrame(patia(3, 4, 1, 1))).toBe(true);
  });

  it("is false for any other width", () => {
    expect(isFrame(patia(3, 5, 1, 1))).toBe(false);
    expect(isFrame(patia(3, 2, 1, 1))).toBe(false);
    expect(isFrame(patia(3, 18, 1, 1))).toBe(false);
  });
});

describe("lengthBucket boundaries", () => {
  it.each([
    [1.5, "patia_1_5_to_4"],
    [4.0, "patia_1_5_to_4"], // inclusive upper bound of bucket 1
    [4.5, "patia_4_5_to_5"], // first value of bucket 2
    [5.0, "patia_4_5_to_5"], // inclusive upper bound of bucket 2
    [5.5, "patia_5_5_to_up"], // first value of bucket 3
    [10, "patia_5_5_to_up"],
  ] as const)("length %s -> %s", (lengthFt, bucket) => {
    expect(lengthBucket(lengthFt)).toBe(bucket);
  });
});

describe("calculateSummary", () => {
  it("returns all-zero buckets for no entries", () => {
    const s = calculateSummary([], [], PRICES);
    expect(s.totalCFT).toBe(0);
    expect(s.grandTotal).toBe(0);
    expect(s.frame_3_4).toEqual({ cft: 0, rate: 320, total: 0 });
    expect(s.pawa).toEqual({ cft: 0, rate: 510, total: 0 });
  });

  it("routes Frame entries to the frame bucket, never a length bucket", () => {
    // width 4, length 8 would map to patia_5_5_to_up if it were not Frame.
    const s = calculateSummary([patia(8, 4, 2, 1)], [], PRICES);
    expect(s.frame_3_4.cft).toBeCloseTo((1 * 4 * 2 * 8) / 144, 10);
    expect(s.patia_5_5_to_up.cft).toBe(0);
  });

  it("aggregates a full project with exact hand-computed totals", () => {
    const patiaEntries: PatiaEntry[] = [
      patia(3, 3, 1, 48), // Frame:   48*3*1*3/144 = 3.0
      patia(4, 6, 2, 3), //  bucket1:  3*6*2*4/144 = 1.0
      patia(5, 12, 2, 6), // bucket2:  6*12*2*5/144 = 5.0
      patia(6, 12, 2, 4), // bucket3:  4*12*2*6/144 = 4.0
    ];
    const pawaEntries: PawaEntry[] = [
      pawa(36, 3, 16), // 16*3*3*36/1728 = 3.0
    ];

    const s = calculateSummary(patiaEntries, pawaEntries, PRICES);

    expect(s.frame_3_4).toEqual({ cft: 3, rate: 320, total: 960 });
    expect(s.patia_1_5_to_4).toEqual({ cft: 1, rate: 420, total: 420 });
    expect(s.patia_4_5_to_5).toEqual({ cft: 5, rate: 520, total: 2600 });
    expect(s.patia_5_5_to_up).toEqual({ cft: 4, rate: 620, total: 2480 });
    expect(s.pawa).toEqual({ cft: 3, rate: 510, total: 1530 });

    expect(s.totalCFT).toBe(16);
    expect(s.grandTotal).toBe(7990);
  });

  it("sums multiple entries within the same bucket", () => {
    const s = calculateSummary(
      [patia(2, 5, 1, 8), patia(4, 6, 2, 3)], // both bucket1
      [],
      PRICES,
    );
    const expected = (8 * 5 * 1 * 2) / 144 + (3 * 6 * 2 * 4) / 144;
    expect(s.patia_1_5_to_4.cft).toBeCloseTo(expected, 10);
  });
});
