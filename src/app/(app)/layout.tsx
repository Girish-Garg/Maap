import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { SessionCacheGuard } from "@/components/session-cache-guard";

/**
 * Authenticated app group. Middleware already gates these routes; this is a
 * second guard so Server Components can rely on a session existing.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      {/* Discards a previous account's offline cache before it can be shown. */}
      <SessionCacheGuard userId={session.user.id} />
      <AppShell>{children}</AppShell>
    </>
  );
}
