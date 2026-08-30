"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  setProjectShare,
  updateProject,
} from "@/lib/server/projects";
import type { NewProject, Project, ProjectEdits } from "@/lib/db/types";

export type { NewProject, Project, ProjectEdits };

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};

/** All of the current user's projects, newest activity first (design §7.2). */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => listProjects(),
  });
}

/** A single project's metadata. */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
  });
}

/**
 * Creates a project, along with its default price row. The owning user is
 * resolved on the server from the active session.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewProject) => createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Updates a project's metadata (name, client, date, notes). */
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (edits: ProjectEdits) => updateProject(id, edits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Permanently deletes a project; entries, prices and snapshots cascade. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enable: boolean) => setProjectShare(id, enable),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) }),
  });
}
