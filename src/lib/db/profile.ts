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
 * Uploads a logo to logos/<user_id>/logo.<ext> (overwriting any previous one)
 * and stores its public URL on the profile. Returns the cache-busted URL.
 * Validates size and type client-side before the network call.
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
