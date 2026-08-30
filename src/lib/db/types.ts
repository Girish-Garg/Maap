/**
 * The row shapes the client sees.
 *
 * Everything the browser gets comes back from a Server Action, so it has to be
 * plain JSON: Prisma's Decimal becomes a number and its Date becomes an ISO
 * string. Each type is derived from the generated Prisma row type with only
 * those fields overridden, so a schema change shows up here as a type error
 * instead of a silent mismatch.
 *
 * Type-only imports: nothing from @prisma/client survives into the client bundle.
 */

import type {
  PatiaEntry as PatiaEntryRow,
  PawaEntry as PawaEntryRow,
  Project as ProjectRow,
  ProjectSnapshot as ProjectSnapshotRow,
  UserDimensions as UserDimensionsRow,
  UserProfile as UserProfileRow,
} from "@prisma/client";
import type { Prices } from "@/lib/types";

/** A project's metadata. Dates are ISO: `project_date` is a plain YYYY-MM-DD. */
export type Project = Omit<
  ProjectRow,
  "project_date" | "created_at" | "updated_at"
> & {
  project_date: string;
  created_at: string;
  updated_at: string;
};

export type PatiaEntry = Omit<
  PatiaEntryRow,
  "length_ft" | "width_in" | "thickness_in"
> & {
  length_ft: number;
  width_in: number;
  thickness_in: number;
};

export type PawaEntry = Omit<PawaEntryRow, "length_in" | "size_side"> & {
  length_in: number;
  size_side: number;
};

/** The coordinates that identify one grid cell (its unique key in the table). */
export type PatiaCoords = Pick<
  PatiaEntry,
  "length_ft" | "width_in" | "thickness_in"
>;

export type PawaCoords = Pick<PawaEntry, "length_in" | "size_side">;

export type Profile = Omit<UserProfileRow, "updated_at"> & {
  updated_at: string;
};

/** The five dimension lists; `user_id` is the only non-list column. */
export type DimensionKey = Exclude<keyof UserDimensionsRow, "user_id">;

export type Dimensions = Omit<UserDimensionsRow, DimensionKey> &
  Record<DimensionKey, number[]>;

/** The dimension lists without their owner - what the UI actually renders. */
export type DimensionLists = Omit<Dimensions, "user_id">;

/** Shape stored in project_snapshots.data and replayed by restoreSnapshot. */
export interface SnapshotData {
  patia: {
    length_ft: number;
    width_in: number;
    thickness_in: number;
    quantity: number;
  }[];
  pawa: { length_in: number; size_side: number; quantity: number }[];
  prices: Prices;
  /** Stored so the history list can show the total without recomputing. */
  grandTotal: number;
}

export type Snapshot = Omit<ProjectSnapshotRow, "created_at" | "data"> & {
  created_at: string;
  data: SnapshotData;
};

/** Fields accepted when creating a project. */
export interface NewProject {
  name: string;
  client_name?: string | null;
  client_address?: string | null;
  project_date?: string;
}

/** Fields accepted when editing a project. */
export interface ProjectEdits {
  name: string;
  client_name?: string | null;
  client_address?: string | null;
  project_date?: string;
  notes?: string | null;
}

export interface ProfilePatch {
  business_name?: string;
  business_address?: string | null;
  business_phone?: string | null;
  logo_url?: string | null;
}
