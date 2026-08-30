"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NewProject, Project, ProjectEdits } from "@/lib/db/types";
import { requireUserId } from "./access";
import { fromDay, toProject } from "./serialize";

/**
 * Project reads and writes. Every query is filtered by the caller's user id, so
 * one user can never see or change another's project.
 */

/** All of the caller's projects, newest activity first. */
export async function listProjects(): Promise<Project[]> {
  const userId = await requireUserId();
  const rows = await prisma.project.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: "desc" },
  });
  return rows.map(toProject);
}

/** A single project's metadata. */
export async function getProject(id: string): Promise<Project> {
  const userId = await requireUserId();
  const row = await prisma.project.findFirst({ where: { id, user_id: userId } });
  if (!row) throw new Error("Project not found.");
  return toProject(row);
}

/**
 * Creates a project owned by the caller, along with its default price row so
 * the Summary has rates from the first open. Both happen in one transaction:
 * a project without prices would render the summary at zero.
 */
export async function createProject(input: NewProject): Promise<Project> {
  const userId = await requireUserId();
  const name = input.name?.trim();
  if (!name) throw new Error("A project name is required.");

  const row = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        user_id: userId,
        name,
        client_name: input.client_name ?? null,
        client_address: input.client_address ?? null,
        ...(input.project_date
          ? { project_date: fromDay(input.project_date) }
          : {}),
      },
    });
    await tx.priceConfig.create({ data: { project_id: project.id } });
    return project;
  });

  return toProject(row);
}

/**
 * Updates a project's metadata. Only the fields the caller sent are touched,
 * and `updated_at` moves so the project sorts to the top of the list.
 */
export async function updateProject(
  id: string,
  edits: ProjectEdits,
): Promise<void> {
  const userId = await requireUserId();
  const name = edits.name?.trim();
  if (!name) throw new Error("A project name is required.");

  const { count } = await prisma.project.updateMany({
    where: { id, user_id: userId },
    data: {
      name,
      ...(edits.client_name !== undefined
        ? { client_name: edits.client_name }
        : {}),
      ...(edits.client_address !== undefined
        ? { client_address: edits.client_address }
        : {}),
      ...(edits.project_date ? { project_date: fromDay(edits.project_date) } : {}),
      ...(edits.notes !== undefined ? { notes: edits.notes } : {}),
      updated_at: new Date(),
    },
  });
  if (count === 0) throw new Error("Project not found.");
}

/** Permanently deletes a project; entries, prices and snapshots cascade. */
export async function deleteProject(id: string): Promise<void> {
  const userId = await requireUserId();
  const { count } = await prisma.project.deleteMany({
    where: { id, user_id: userId },
  });
  if (count === 0) throw new Error("Project not found.");
}

/**
 * Enables or disables the read-only public share link. Enabling mints a fresh
 * unguessable token; disabling clears it, which revokes any link already shared.
 * `updated_at` deliberately stays put: sharing isn't an edit, and bumping it
 * would reshuffle the project list.
 */
export async function setProjectShare(
  id: string,
  enable: boolean,
): Promise<string | null> {
  const userId = await requireUserId();
  const token = enable ? randomUUID() : null;
  const { count } = await prisma.project.updateMany({
    where: { id, user_id: userId },
    data: { public_share_id: token },
  });
  if (count === 0) throw new Error("Project not found.");
  return token;
}
