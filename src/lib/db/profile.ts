"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["user_profiles"]["Row"];

export const profileKey = ["user_profile"] as const;

/** The signed-in user's business profile (shown on the PDF bill). */
export function useProfile() {
  const supabase = createClient();
  return useQuery({
    queryKey: profileKey,
    queryFn: async (): Promise<Profile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

type ProfilePatch = {
  business_name?: string;
  business_address?: string | null;
  business_phone?: string | null;
  logo_url?: string | null;
};

export function useUpdateProfile() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("user_profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}

const MAX_LOGO_BYTES = 1_048_576; // 1 MB, matches the bucket limit.
const LOGO_MIMES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Lists every file under logos/<user_id>/ and deletes them. Used before an
 * upload (to avoid orphans when the extension changes) and on remove.
 * Returns silently if nothing's there.
 */
async function clearUserLogoFiles(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const { data: files, error } = await supabase.storage
    .from("logos")
    .list(userId);
  if (error) throw error;
  if (!files || files.length === 0) return;
  const paths = files.map((f) => `${userId}/${f.name}`);
  const { error: delErr } = await supabase.storage.from("logos").remove(paths);
  if (delErr) throw delErr;
}

/**
 * Uploads a logo to logos/<user_id>/logo.<ext>. Any previous file in the user's
 * folder is removed first - this handles the case where the old logo was a
 * .png and the new one is a .jpg (a plain overwrite would leave the .png as an
 * orphan in Storage). Returns the cache-busted public URL.
 */
export function useUploadLogo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!LOGO_MIMES.includes(file.type)) {
        throw new Error("Logo must be a PNG, JPG, or WebP image.");
      }
      if (file.size > MAX_LOGO_BYTES) {
        throw new Error("Logo must be under 1 MB.");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Drop any previous file(s) first so we never leave orphans behind.
      await clearUserLogoFiles(supabase, user.id);

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      // Cache-bust so an overwritten logo refreshes immediately.
      const url = `${data.publicUrl}?v=${Date.now()}`;

      const { error: profErr } = await supabase
        .from("user_profiles")
        .update({ logo_url: url, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (profErr) throw profErr;
      return url;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}

/**
 * Removes the logo: deletes every file under logos/<user_id>/ and clears
 * logo_url on the profile. Both steps run together so a successful remove
 * leaves nothing behind in Storage.
 */
export function useRemoveLogo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      await clearUserLogoFiles(supabase, user.id);

      const { error: profErr } = await supabase
        .from("user_profiles")
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (profErr) throw profErr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}
