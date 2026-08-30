import { handlers } from "@/auth";

/**
 * Auth.js's own endpoints: sign-in, sign-out, CSRF, and the Google callback
 * (/api/auth/callback/google). Nothing else in the app routes through here.
 */
export const { GET, POST } = handlers;
