import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };
import { env } from "@/lib/env";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Bridges the auth session through Next's cookie store. The cookie setters are
 * wrapped in try/catch because Server Components cannot mutate cookies - the
 * middleware handles refresh there, so the no-op is safe.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component; middleware refreshes the session.
        }
      },
    },
  });
}
