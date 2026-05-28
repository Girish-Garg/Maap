import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on all paths except Next internals, static assets, and PWA files
  // (manifest, service worker, icons) - those must be reachable without a
  // session, so the browser can install the app and fetch icons when logged out.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|apple-icon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
