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
 */

const MAX_LOGO_BYTES = 1_048_576; // 1 MB.
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function assertConfigured(): void {
  if (!env.storageConfigured) {
    throw new Error(
      "Logo storage is not configured. Set the OCI_* variables described in " +
        ".env.example, or leave the logo unset.",
    );
  }
}

/** Uploads a logo and returns the URL the app serves it from. */
export async function uploadLogo(formData: FormData): Promise<string> {
  const userId = await requireUserId();
  assertConfigured();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file was uploaded.");

  const extension = EXTENSIONS[file.type];
  if (!extension) throw new Error("Logo must be a PNG, JPG, or WebP image.");
  if (file.size > MAX_LOGO_BYTES) throw new Error("Logo must be under 1 MB.");

  // Clear the folder first rather than overwriting: the new file may have a
  // different extension, and an overwrite would leave the old one behind.
  await deletePrefix(userPrefix(userId));

  const key = objectKey(userId, `logo.${extension}`);
  await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);

  // The version marker changes on every upload so a replaced logo is not served
  // from a stale cache entry.
  const url = `/api/logo?v=${Date.now()}`;

  await prisma.userProfile.upsert({
    where: { user_id: userId },
    create: { user_id: userId, logo_url: url, logo_key: key, updated_at: new Date() },
    update: { logo_url: url, logo_key: key, updated_at: new Date() },
  });

  return url;
}

/** Deletes the stored object and clears the profile's reference to it. */
export async function removeLogo(): Promise<void> {
  const userId = await requireUserId();
  assertConfigured();

  await deletePrefix(userPrefix(userId));

  await prisma.userProfile.upsert({
    where: { user_id: userId },
    create: { user_id: userId, logo_url: null, logo_key: null, updated_at: new Date() },
    update: { logo_url: null, logo_key: null, updated_at: new Date() },
  });
}
