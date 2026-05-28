"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Supabase client for use in Client Components. Reads/writes the auth session
 * from browser cookies (managed by @supabase/ssr). Create one per call; the
 * underlying singleton is handled by the library.
 */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
