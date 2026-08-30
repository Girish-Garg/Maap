import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Identity and ownership checks for the data layer.
 *
 * The database no longer enforces per-row access itself: Supabase's Row Level
 * Security policies went away with Supabase Postgres, so the checks that used to
 * live in `owns_project()` and the RLS policies are made here instead. Every
 * Server Action is a public HTTP endpoint, so each one starts by resolving the
 * caller and scoping its query to that user.
 */

/** The signed-in user's id, or null when there is no session. */
export async function currentUserId(): Promise<string | null> {
  // auth() verifies the session cookie's signature before returning anything,
  // so the id here is the one Auth.js issued, not whatever the cookie claims.
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Like {@link currentUserId}, but refuses to continue without a session. */
export async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");
  return userId;
}

/**
 * Throws unless `projectId` exists and belongs to `userId`. Used before writes
 * that can't express the ownership test as part of their own filter (upserts,
 * multi-statement transactions).
 */
export async function assertOwnsProject(
  projectId: string,
  userId: string,
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, user_id: userId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found.");
}
