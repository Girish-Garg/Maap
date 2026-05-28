"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};

/** All of the current user's projects, newest activity first (design §7.2). */
export function useProjects() {
  const supabase = createClient();
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** A single project's metadata. */
export function useProject(id: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export interface NewProject {
  name: string;
  client_name?: string | null;
  client_address?: string | null;
  project_date?: string;
}

/**
 * Creates a project (and lets price_configs default-seed lazily on first price
 * read/write). The owning user_id is taken from the active session.
 */
export function useCreateProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewProject): Promise<Project> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error("Not signed in");

      const insert: ProjectInsert = { ...input, user_id: user.id };
      const { data, error } = await supabase
        .from("projects")
        .insert(insert)
        .select()
        .single();
      if (error) throw error;

      // Seed a default price row so the Summary has rates from the first open.
      await supabase.from("price_configs").insert({ project_id: data.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export interface ProjectEdits {
  name: string;
  client_name?: string | null;
  client_address?: string | null;
  project_date?: string;
  notes?: string | null;
}

/** Updates a project's metadata (name, client, date, notes). */
export function useUpdateProject(id: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (edits: ProjectEdits) => {
      const { error } = await supabase
        .from("projects")
        .update({ ...edits, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Permanently deletes a project; entries, prices and snapshots cascade. */
export function useDeleteProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Enables or disables the read-only public share link. Enabling mints a fresh
 * unguessable token; disabling clears it (revoking any previously shared link).
 */
export function useSetProjectShare(id: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enable: boolean): Promise<string | null> => {
      const token = enable ? crypto.randomUUID() : null;
      const { error } = await supabase
        .from("projects")
        .update({ public_share_id: token })
        .eq("id", id);
      if (error) throw error;
      return token;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) }),
  });
}
