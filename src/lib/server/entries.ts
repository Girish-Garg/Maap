"use server";

import { prisma } from "@/lib/prisma";
import type { PatiaCoords, PatiaEntry, PawaCoords, PawaEntry } from "@/lib/db/types";
import { assertOwnsProject, requireUserId } from "./access";
import { toPatiaEntry, toPawaEntry } from "./serialize";

/**
 * Grid cell reads and writes. A cell is identified by its coordinates rather
 * than an id, so a write is an upsert against the table's unique constraint and
 * stays idempotent when the client retries a queued offline mutation.
 */

/** Rejects anything that isn't a real number before it reaches a query. */
function coord(value: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${field}.`);
  }
  return value;
}

function quantityOf(value: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("Quantity must be a whole number.");
  }
  return value;
}

export async function listPatiaEntries(projectId: string): Promise<PatiaEntry[]> {
  const userId = await requireUserId();
  // The ownership test rides along as a relation filter: a project that isn't
  // the caller's simply has no visible entries.
  const rows = await prisma.patiaEntry.findMany({
    where: { project_id: projectId, project: { user_id: userId } },
  });
  return rows.map(toPatiaEntry);
}

export async function listPawaEntries(projectId: string): Promise<PawaEntry[]> {
  const userId = await requireUserId();
  const rows = await prisma.pawaEntry.findMany({
    where: { project_id: projectId, project: { user_id: userId } },
  });
  return rows.map(toPawaEntry);
}

/**
 * Sets a Patia cell's quantity. Quantity 0 deletes the row so empty cells stay
 * genuinely empty rather than being stored as zeros.
 */
export async function setPatiaCell(
  projectId: string,
  coords: PatiaCoords,
  quantity: number,
): Promise<void> {
  const userId = await requireUserId();
  await assertOwnsProject(projectId, userId);

  const where = {
    length_ft: coord(coords.length_ft, "length"),
    width_in: coord(coords.width_in, "width"),
    thickness_in: coord(coords.thickness_in, "thickness"),
  };

  if (quantityOf(quantity) <= 0) {
    // Deleting a cell that was never filled is a no-op, not an error.
    await prisma.patiaEntry.deleteMany({ where: { project_id: projectId, ...where } });
    return;
  }

  await prisma.patiaEntry.upsert({
    where: {
      project_id_length_ft_width_in_thickness_in: { project_id: projectId, ...where },
    },
    create: { project_id: projectId, ...where, quantity },
    update: { quantity },
  });
}

/** Pawa equivalent of {@link setPatiaCell}. */
export async function setPawaCell(
  projectId: string,
  coords: PawaCoords,
  quantity: number,
): Promise<void> {
  const userId = await requireUserId();
  await assertOwnsProject(projectId, userId);

  const where = {
    length_in: coord(coords.length_in, "length"),
    size_side: coord(coords.size_side, "size"),
  };

  if (quantityOf(quantity) <= 0) {
    await prisma.pawaEntry.deleteMany({ where: { project_id: projectId, ...where } });
    return;
  }

  await prisma.pawaEntry.upsert({
    where: { project_id_length_in_size_side: { project_id: projectId, ...where } },
    create: { project_id: projectId, ...where, quantity },
    update: { quantity },
  });
}
