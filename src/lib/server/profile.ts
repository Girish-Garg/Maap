"use server";

import { prisma } from "@/lib/prisma";
import type { Profile, ProfilePatch } from "@/lib/db/types";
import { currentUserId, requireUserId } from "./access";
import { toProfile } from "./serialize";

/**
 * The business profile printed on bills.
 *
 * Supabase seeded this row from a trigger on auth.users. Without that trigger
 * the row is created the first time it's needed - on read here, so the Settings
 * form and the PDF header always have something to bind to.
 */

/** Accepts only the profile's own text fields. */
function validate(patch: ProfilePatch): ProfilePatch {
  const clean: ProfilePatch = {};

  if (patch?.business_name !== undefined) {
    if (typeof patch.business_name !== "string") {
      throw new Error("Business name must be text.");
    }
    clean.business_name = patch.business_name;
  }
  for (const key of ["business_address", "business_phone", "logo_url"] as const) {
    const value = patch?.[key];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      throw new Error(`${key.replace("_", " ")} must be text.`);
    }
    clean[key] = value;
  }

  if (Object.keys(clean).length === 0) throw new Error("Nothing to update.");
  return clean;
}

/** The caller's profile, or null when nobody is signed in. */
export async function getProfile(): Promise<Profile | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const existing = await prisma.userProfile.findUnique({
    where: { user_id: userId },
  });
  if (existing) return toProfile(existing);

  // First read for this user. upsert rather than create so two concurrent
  // first-loads can't collide on the primary key.
  const created = await prisma.userProfile.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
  });
  return toProfile(created);
}

export async function updateProfile(patch: ProfilePatch): Promise<void> {
  const userId = await requireUserId();
  const clean = validate(patch);
  const data = { ...clean, updated_at: new Date() };

  await prisma.userProfile.upsert({
    where: { user_id: userId },
    create: { user_id: userId, ...data },
    update: data,
  });
}
