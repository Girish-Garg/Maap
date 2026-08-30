import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/**
 * Gates private routes. Anything outside PUBLIC_PATHS needs a session, and an
 * unauthenticated request is sent to /login.
 *
 * Only the edge-safe half of the config is imported: middleware runs at the
 * edge, where the Prisma adapter in auth.ts cannot load. Reading the session is
 * pure JWT verification, so nothing here touches the database.
 */
const { auth } = NextAuth(authConfig);

/** Paths reachable without a session. Everything else requires sign-in. */
const PUBLIC_PATHS = ["/login", "/share", "/api/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default auth((request) => {
  const { pathname } = request.nextUrl;

  // The container healthcheck reports on the app and its database. Redirecting
  // it to /login would make an unhealthy container look healthy, because the
  // probe follows the redirect and gets a 200.
  if (pathname === "/api/health") return NextResponse.next();

  if (!request.auth && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Run on all paths except Next internals, static assets, and PWA files
  // (manifest, service worker, icons) - those must be reachable without a
  // session, so the browser can install the app and fetch icons when logged out.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|apple-icon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
