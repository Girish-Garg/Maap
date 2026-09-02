"use server";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { requireUserId } from "./access";
import { deletePrefix, objectKey, putObject, userPrefix } from "./object-storage";

/**
 * Business logo upload and removal.
 *
 * The file goes to the shared object storage bucket under this project's own
 * prefix, and the browser never talks to the bucket: it holds no storage
 * credentials, and the bucket is private. What is stored on the profile is a
 * path on this origin (/api/logo), which the route handler resolves back to the
 * object.
 *
 * Replacing or removing a logo deletes the previous object, so a user's folder
 * holds at most one file and the bucket doesn't accumulate images nobody can
 * reach any more.
 *
 * Failures come back as a value rather than an exception. Next.js replaces a
 * thrown Server Action message with a generic one in production builds, so a
 * throw here would reach Settings as "an error occurred" and the real cause
 * would exist only in the container log. Returning it keeps the message intact
 * for the user; the cause is logged as well, for the operator.
 */

const MAX_LOGO_BYTES = 1_048_576; // 1 MB.
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Either the new logo URL, or a message to show under the logo in Settings. */
export type LogoResult = { url: string | null } | { error: string };

const NOT_CONFIGURED =
  "Logo storage is not configured. Set the OCI_* variables described in " +
  ".env.example, or leave the logo unset.";

/** Logs the real error for the operator, and returns what the user should see. */
function failure(action: string, error: unknown): { error: string } {
  console.error(`[logo] ${action} failed:`, error);
  const detail = error instanceof Error ? error.message : String(error);
  return { error: `Could not ${action} the logo: ${detail}` };
}

export async function uploadLogo(formData: FormData): Promise<LogoResult> {
  const userId = await requireUserId();
  if (!env.storageConfigured) return { error: NOT_CONFIGURED };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file was uploaded." };

  const extension = EXTENSIONS[file.type];
  if (!extension) return { error: "Logo must be a PNG, JPG, or WebP image." };
  if (file.size > MAX_LOGO_BYTES) return { error: "Logo must be under 1 MB." };

  const key = objectKey(userId, `logo.${extension}`);

  try {
    // Clear the folder first rather than overwriting: the new file may have a
    // different extension, and an overwrite would leave the old one behind.
    await deletePrefix(userPrefix(userId));
    await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (error) {
    return failure("upload", error);
  }

  // The version marker changes on every upload so a replaced logo is not served
  // from a stale cache entry.
  const url = `/api/logo?v=${Date.now()}`;

  await prisma.userProfile.upsert({
    where: { user_id: userId },
    create: { user_id: userId, logo_url: url, logo_key: key, updated_at: new Date() },
    update: { logo_url: url, logo_key: key, updated_at: new Date() },
  });

  return { url };
}

/** Deletes the stored object and clears the profile's reference to it. */
export async function removeLogo(): Promise<LogoResult> {
  const userId = await requireUserId();
  if (!env.storageConfigured) return { error: NOT_CONFIGURED };

  try {
    await deletePrefix(userPrefix(userId));
  } catch (error) {
    // The profile is left pointing at the object: clearing it here would
    // orphan a file nothing can reach or delete afterwards.
    return failure("remove", error);
  }

  await prisma.userProfile.upsert({
    where: { user_id: userId },
    create: { user_id: userId, logo_url: null, logo_key: null, updated_at: new Date() },
    update: { logo_url: null, logo_key: null, updated_at: new Date() },
  });

  return { url: null };
}
