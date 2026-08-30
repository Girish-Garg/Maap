import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prices } from "@/lib/types";

/**
 * Read-only public share links.
 *
 * This replaces the get_shared_project Postgres function, and keeps its rule:
 * the only way in is an exact match on the project's unguessable token, so a
 * visitor can neither enumerate projects nor read one they weren't given a link
 * to. The returned object is assembled field by field - the project's id,
 * owner and notes never leave the server.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SharedData {
  project: {
    name: string;
    client_name: string | null;
    client_address: string | null;
    project_date: string;
  };
  business: {
    business_name: string;
    business_address: string | null;
    business_phone: string | null;
    logo_url: string | null;
  } | null;
  prices: Prices | null;
  patia: {
    length_ft: number;
    width_in: number;
    thickness_in: number;
    quantity: number;
  }[];
  pawa: { length_in: number; size_side: number; quantity: number }[];
}

export async function getSharedProject(
  token: string,
): Promise<SharedData | null> {
  // A malformed token can't match a uuid column, so don't ask the database.
  if (!UUID.test(token)) return null;

  const project = await prisma.project.findUnique({
    where: { public_share_id: token },
    select: {
      user_id: true,
      name: true,
      client_name: true,
      client_address: true,
      project_date: true,
      price_config: {
        select: {
          frame_3_4: true,
          patia_1_5_to_4: true,
          patia_4_5_to_5: true,
          patia_5_5_to_up: true,
          pawa: true,
        },
      },
      patia_entries: {
        select: {
          length_ft: true,
          width_in: true,
          thickness_in: true,
          quantity: true,
        },
      },
      pawa_entries: {
        select: { length_in: true, size_side: true, quantity: true },
      },
    },
  });
  if (!project) return null;

  const business = await prisma.userProfile.findUnique({
    where: { user_id: project.user_id },
    select: {
      business_name: true,
      business_address: true,
      business_phone: true,
      logo_url: true,
    },
  });

  const prices = project.price_config;

  return {
    project: {
      name: project.name,
      client_name: project.client_name,
      client_address: project.client_address,
      project_date: project.project_date.toISOString().slice(0, 10),
    },
    business,
    prices: prices
      ? {
          frame_3_4: prices.frame_3_4.toNumber(),
          patia_1_5_to_4: prices.patia_1_5_to_4.toNumber(),
          patia_4_5_to_5: prices.patia_4_5_to_5.toNumber(),
          patia_5_5_to_up: prices.patia_5_5_to_up.toNumber(),
          pawa: prices.pawa.toNumber(),
        }
      : null,
    patia: project.patia_entries.map((e) => ({
      length_ft: e.length_ft.toNumber(),
      width_in: e.width_in.toNumber(),
      thickness_in: e.thickness_in.toNumber(),
      quantity: e.quantity,
    })),
    pawa: project.pawa_entries.map((e) => ({
      length_in: e.length_in.toNumber(),
      size_side: e.size_side.toNumber(),
      quantity: e.quantity,
    })),
  };
}
