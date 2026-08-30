import type { NextAuthConfig } from "next-auth";

/**
 * The half of the Auth.js configuration that is safe to run at the edge.
 *
 * Middleware runs in the Edge runtime, where Prisma and bcrypt cannot load, so
 * the adapter and the providers stay in auth.ts (Node) and only this shared
 * part - pages, session strategy, token shape - is imported by middleware.
 * Verifying a session here is pure JWT work and needs neither.
 */
export const authConfig = {
  // Auth.js sends unauthenticated visitors here instead of its own built-in page.
  pages: { signIn: "/login" },

  // JWT rather than database sessions: the credentials provider (email +
  // password) only supports this strategy. The adapter still writes users and
  // linked Google accounts to Postgres.
  session: { strategy: "jwt" },

  callbacks: {
    // Carry the database user id through the token so every server-side check
    // can read it without a query.
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;
