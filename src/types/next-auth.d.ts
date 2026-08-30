import type { DefaultSession } from "next-auth";

/**
 * The session carries the database user id (set in auth.config.ts's callbacks),
 * which Auth.js's default Session type doesn't declare. Everything server-side
 * scopes its queries by this value, so it needs to be typed rather than cast.
 */
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
