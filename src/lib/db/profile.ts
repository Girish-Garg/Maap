"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/server/profile";
import { removeLogo, uploadLogo } from "@/lib/server/logo";
import type { Profile, ProfilePatch } from "@/lib/db/types";

export type { Profile };

export const profileKey = ["user_profile"] as const;

/** The signed-in user's business profile (shown on the PDF bill). */
export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => getProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}

const MAX_LOGO_BYTES = 1_048_576; // 1 MB, matches the bucket limit.
const LOGO_MIMES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Uploads a logo and returns its public URL.
 *
 * The file goes to a Server Action, which is the only thing holding storage
 * credentials - the browser has none. Type and size are checked here to fail
 * fast, and again on the server before anything is written.
 */
export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      if (!LOGO_MIMES.includes(file.type)) {
        throw new Error("Logo must be a PNG, JPG, or WebP image.");
      }
      if (file.size > MAX_LOGO_BYTES) {
        throw new Error("Logo must be under 1 MB.");
      }
      const formData = new FormData();
      formData.set("file", file);
      return uploadLogo(formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}

/** Removes the logo file and clears logo_url on the profile. */
export function useRemoveLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => removeLogo(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}
