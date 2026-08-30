"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/app/auth/actions";
import { clearQueryCache } from "@/lib/query-cache";
import { Button } from "@/components/ui/button";

/**
 * Signs out, and wipes the offline cache on the way.
 *
 * Ending the session is a server concern, but the projects cached in IndexedDB
 * are not - leaving them behind would keep this account's work readable on the
 * device after signing out.
 */
export function SignOutButton() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await clearQueryCache(queryClient);
        // Redirects to /login; the action throws Next's redirect to do it.
        await signOut();
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}
