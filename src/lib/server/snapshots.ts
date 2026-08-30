"use server";

import { prisma } from "@/lib/prisma";
import type { Prices } from "@/lib/types";
import type { Snapshot, SnapshotData } from "@/lib/db/types";
import { assertOwnsProject, requireUserId } from "./access";
import { toSnapshot } from "./serialize";

/** Point-in-time copies of a project's cells and rates, and restoring them. */

const PRICE_KEYS = [
  "frame_3_4",
  "patia_1_5_to_4",
  "patia_4_5_to_5",
  "patia_5_5_to_up",
  "pawa",
] as const satisfies readonly (keyof Prices)[];

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Snapshot is malformed: ${field} is not a number.`);
  }
  return value;
}

function quantity(value: unknown): number {
  const n = number(value, "quantity");
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("Snapshot is malformed: quantity must be a whole number.");
  }
  return n;
}

/**
 * Rebuilds the payload field by field rather than storing whatever the client
 * sent, so a snapshot can only ever hold the shape restoreSnapshot replays.
 */
function normalize(data: SnapshotData): SnapshotData {
  const patia = (Array.isArray(data?.patia) ? data.patia : []).map((e) => ({
    length_ft: number(e?.length_ft, "length_ft"),
    width_in: number(e?.width_in, "width_in"),
    thickness_in: number(e?.thickness_in, "thickness_in"),
    quantity: quantity(e?.quantity),
  }));
  const pawa = (Array.isArray(data?.pawa) ? data.pawa : []).map((e) => ({
    length_in: number(e?.length_in, "length_in"),
    size_side: number(e?.size_side, "size_side"),
    quantity: quantity(e?.quantity),
  }));

  const prices = {} as Prices;
  for (const key of PRICE_KEYS) prices[key] = number(data?.prices?.[key], key);

  return { patia, pawa, prices, grandTotal: number(data?.grandTotal, "grandTotal") };
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const userId = await requireUserId();
  const rows = await prisma.projectSnapshot.findMany({
    where: { project_id: projectId, project: { user_id: userId } },
    orderBy: { created_at: "desc" },
  });
  return rows.map(toSnapshot);
}

export async function saveSnapshot(
  projectId: string,
  label: string | null,
  data: SnapshotData,
): Promise<void> {
  const userId = await requireUserId();
  await assertOwnsProject(projectId, userId);
  if (label !== null && typeof label !== "string") {
    throw new Error("Snapshot label must be text.");
  }

  await prisma.projectSnapshot.create({
    data: {
      project_id: projectId,
      label,
      data: normalize(data) as unknown as object,
    },
  });
}

/**
 * Replaces a project's cells with the ones held in a snapshot.
 *
 * This replaces the restore_snapshot Postgres function. The delete-then-insert
 * runs inside one transaction for the same reason the function did: a failure
 * partway through must not leave the project holding half of each version.
 */
export async function restoreSnapshot(snapshotId: string): Promise<void> {
  const userId = await requireUserId();

  // Ownership is part of the lookup, so an id that exists but belongs to
  // someone else is indistinguishable from one that doesn't exist.
  const snapshot = await prisma.projectSnapshot.findFirst({
    where: { id: snapshotId, project: { user_id: userId } },
    select: { project_id: true, data: true },
  });
  if (!snapshot) throw new Error("Snapshot not found.");

  const projectId = snapshot.project_id;
  const data = normalize(snapshot.data as unknown as SnapshotData);

  await prisma.$transaction(async (tx) => {
    await tx.patiaEntry.deleteMany({ where: { project_id: projectId } });
    await tx.pawaEntry.deleteMany({ where: { project_id: projectId } });

    if (data.patia.length > 0) {
      await tx.patiaEntry.createMany({
        data: data.patia.map((e) => ({ project_id: projectId, ...e })),
      });
    }
    if (data.pawa.length > 0) {
      await tx.pawaEntry.createMany({
        data: data.pawa.map((e) => ({ project_id: projectId, ...e })),
      });
    }

    // Rates are restored only where the project already has a price row, which
    // is what the SQL function did.
    await tx.priceConfig.updateMany({
      where: { project_id: projectId },
      data: data.prices,
    });

    await tx.project.update({
      where: { id: projectId },
      data: { updated_at: new Date() },
    });
  });
}
