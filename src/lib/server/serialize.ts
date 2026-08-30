import "server-only";
import type {
  PatiaEntry as PatiaEntryRow,
  PawaEntry as PawaEntryRow,
  PriceConfig as PriceConfigRow,
  Project as ProjectRow,
  ProjectSnapshot as ProjectSnapshotRow,
  UserDimensions as UserDimensionsRow,
  UserProfile as UserProfileRow,
} from "@prisma/client";
import type { Prices } from "@/lib/types";
import type {
  DimensionLists,
  PatiaEntry,
  PawaEntry,
  Profile,
  Project,
  Snapshot,
  SnapshotData,
} from "@/lib/db/types";

/**
 * Prisma rows to the plain JSON the client receives. Decimal columns become
 * numbers and timestamps become ISO strings, which is the shape the UI and
 * lib/calc.ts already expect.
 */

/** Postgres DATE comes back as UTC midnight, so the ISO prefix is its day. */
function toDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** The inverse: the YYYY-MM-DD from a date input back to that same instant. */
export function fromDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date "${value}".`);
  }
  return date;
}

/** Keeps only the finite numbers in a jsonb list. */
function toNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item),
  );
}

export function toProject(row: ProjectRow): Project {
  return {
    ...row,
    project_date: toDay(row.project_date),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function toPatiaEntry(row: PatiaEntryRow): PatiaEntry {
  return {
    ...row,
    length_ft: row.length_ft.toNumber(),
    width_in: row.width_in.toNumber(),
    thickness_in: row.thickness_in.toNumber(),
  };
}

export function toPawaEntry(row: PawaEntryRow): PawaEntry {
  return {
    ...row,
    length_in: row.length_in.toNumber(),
    size_side: row.size_side.toNumber(),
  };
}

export function toProfile(row: UserProfileRow): Profile {
  return { ...row, updated_at: row.updated_at.toISOString() };
}

export function toDimensionLists(row: UserDimensionsRow): DimensionLists {
  return {
    patia_lengths_ft: toNumberList(row.patia_lengths_ft),
    patia_widths_in: toNumberList(row.patia_widths_in),
    patia_thicknesses_in: toNumberList(row.patia_thicknesses_in),
    pawa_lengths_in: toNumberList(row.pawa_lengths_in),
    pawa_sizes: toNumberList(row.pawa_sizes),
  };
}

/** Drops project_id to leave the calc-ready {@link Prices}. */
export function toPrices(row: PriceConfigRow): Prices {
  return {
    frame_3_4: row.frame_3_4.toNumber(),
    patia_1_5_to_4: row.patia_1_5_to_4.toNumber(),
    patia_4_5_to_5: row.patia_4_5_to_5.toNumber(),
    patia_5_5_to_up: row.patia_5_5_to_up.toNumber(),
    pawa: row.pawa.toNumber(),
  };
}

export function toSnapshot(row: ProjectSnapshotRow): Snapshot {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    data: row.data as unknown as SnapshotData,
  };
}
