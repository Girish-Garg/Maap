import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { authConfig } from "@/auth.config";

/**
 * Auth.js, backed by the same Postgres the rest of the app uses.
 *
 * Two ways in: Google, and email + password. Accounts, and the link between an
 * account and its Google identity, are written by the Prisma adapter; sessions
 * are JWTs (see auth.config.ts for why).
 *
 * This module pulls in Prisma and bcrypt, so it must never be imported from
 * middleware - import auth.config.ts there instead.
 */

/** Google is optional: without credentials configured the button is hidden. */
const googleProvider = env.googleConfigured
  ? [
      Google({
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
        // Let a Google sign-in adopt an existing account with the same address
        // instead of failing with OAuthAccountNotLinked. Safe here because
        // Google verifies the addresses it reports.
        allowDangerousEmailAccountLinking: true,
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...googleProvider,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * Returning null is the only failure signal Auth.js accepts here, and it
       * reaches the UI as one generic "wrong email or password" - deliberately
       * the same answer whether the address exists, so this can't be used to
       * discover who has an account.
       */
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // No hash means a Google-only account: there is no password to match.
        if (!user?.password_hash) return null;

        if (!(await bcrypt.compare(password, user.password_hash))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
});
