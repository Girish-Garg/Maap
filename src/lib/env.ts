/**
 * Typed, validated access to the public Supabase env vars.
 * Only the anon key reaches the client - safe by design (architecture.md
 * §Security). The service role key is never referenced in app code.
 *
 * Reads are lazy (via getters) so a missing var fails at the call site with a
 * clear message, rather than crashing the whole module graph at import time.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in (see README).`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey(): string {
    // Supabase renamed the browser key from "anon" to "publishable"
    // (sb_publishable_...). Accept either; both are safe to ship to the client.
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
};
