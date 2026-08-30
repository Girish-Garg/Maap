"use server";

import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICES } from "@/lib/db/defaults";
import type { Prices } from "@/lib/types";
import { assertOwnsProject, requireUserId } from "./access";
import { toPrices } from "./serialize";

/** Per-project rates in INR/CFT. */

const PRICE_KEYS = [
  "frame_3_4",
  "patia_1_5_to_4",
  "patia_4_5_to_5",
  "patia_5_5_to_up",
  "pawa",
] as const satisfies readonly (keyof Prices)[];

/** Accepts only the five rate fields, each a non-negative finite number. */
function validate(prices: Prices): Prices {
  const clean = {} as Prices;
  for (const key of PRICE_KEYS) {
    const value = prices?.[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid price for ${key}.`);
    }
    clean[key] = value;
  }
  return clean;
}

/**
 * The project's rates. Falls back to the defaults when no row exists yet, which
 * keeps the Summary rendering rather than erroring.
 */
export async function getPrices(projectId: string): Promise<Prices> {
  const userId = await requireUserId();
  const row = await prisma.priceConfig.findFirst({
    where: { project_id: projectId, project: { user_id: userId } },
  });
  return row ? toPrices(row) : DEFAULT_PRICES;
}

export async function updatePrices(
  projectId: string,
  prices: Prices,
): Promise<void> {
  const userId = await requireUserId();
  await assertOwnsProject(projectId, userId);
  const clean = validate(prices);

  await prisma.priceConfig.upsert({
    where: { project_id: projectId },
    create: { project_id: projectId, ...clean },
    update: clean,
  });
}
