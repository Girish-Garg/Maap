"use server";

import { prisma } from "@/lib/prisma";
import { DEFAULT_DIMENSIONS } from "@/lib/db/defaults";
import type { DimensionKey, DimensionLists } from "@/lib/db/types";
import { requireUserId } from "./access";
import { toDimensionLists } from "./serialize";

/**
 * The caller's dimension lists - the axes of every grid.
 *
 * Supabase created this row from a trigger on auth.users. The database no longer
 * sees sign-ups, so the row is instead created on first write and reads fall
 * back to the defaults until then.
 */

const DIMENSION_KEYS = [
  "patia_lengths_ft",
  "patia_widths_in",
  "patia_thicknesses_in",
  "pawa_lengths_in",
  "pawa_sizes",
] as const satisfies readonly DimensionKey[];

function isDimensionKey(value: string): value is DimensionKey {
  return (DIMENSION_KEYS as readonly string[]).includes(value);
}

/** Keeps only known list names holding finite, non-negative numbers. */
function validate(patch: Partial<DimensionLists>): Partial<DimensionLists> {
  const clean: Partial<DimensionLists> = {};
  for (const [key, list] of Object.entries(patch ?? {})) {
    if (!isDimensionKey(key)) throw new Error(`Unknown dimension list "${key}".`);
    if (
      !Array.isArray(list) ||
      list.some((n) => typeof n !== "number" || !Number.isFinite(n) || n <= 0)
    ) {
      throw new Error(`"${key}" must be a list of positive numbers.`);
    }
    clean[key] = list;
  }
  if (Object.keys(clean).length === 0) throw new Error("Nothing to update.");
  return clean;
}

export async function getDimensions(): Promise<DimensionLists> {
  const userId = await requireUserId();
  const row = await prisma.userDimensions.findUnique({
    where: { user_id: userId },
  });
  return row ? toDimensionLists(row) : DEFAULT_DIMENSIONS;
}

export async function updateDimensions(
  patch: Partial<DimensionLists>,
): Promise<void> {
  const userId = await requireUserId();
  const clean = validate(patch);

  // Create-on-first-write: the columns the patch doesn't mention take their
  // schema defaults, which are the same lists the UI shows before any edit.
  await prisma.userDimensions.upsert({
    where: { user_id: userId },
    create: { user_id: userId, ...clean },
    update: clean,
  });
}

/**
 * How many of the caller's projects use a given dimension value. The Settings
 * screen warns with this count before removing a value that existing entries
 * still reference.
 */
export async function countProjectsUsingDimension(
  key: DimensionKey,
  value: number,
): Promise<number> {
  const userId = await requireUserId();
  if (!isDimensionKey(key)) throw new Error(`Unknown dimension list "${key}".`);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Invalid dimension value.");
  }

  const owned = { project: { user_id: userId } };

  if (key === "pawa_lengths_in" || key === "pawa_sizes") {
    const column = key === "pawa_lengths_in" ? "length_in" : "size_side";
    const rows = await prisma.pawaEntry.findMany({
      where: { ...owned, [column]: value },
      select: { project_id: true },
      distinct: ["project_id"],
    });
    return rows.length;
  }

  const column =
    key === "patia_lengths_ft"
      ? "length_ft"
      : key === "patia_widths_in"
        ? "width_in"
        : "thickness_in";
  const rows = await prisma.patiaEntry.findMany({
    where: { ...owned, [column]: value },
    select: { project_id: true },
    distinct: ["project_id"],
  });
  return rows.length;
}
