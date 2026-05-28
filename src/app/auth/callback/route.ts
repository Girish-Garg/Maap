import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / magic-link landing. Supabase appends a `code` to the redirect URL;
 * we exchange it for a session and send the user to `next`, defaulting to the
 * project list.
 *
 * Behind a reverse proxy (Heroku, Cloudflare, etc.), `request.url`'s origin can
 * reflect the dyno's internal bind address (e.g. localhost:<random port>) - so
 * we derive the public origin from `x-forwarded-host` / `x-forwarded-proto` and
 * fall back to NEXT_PUBLIC_SITE_URL, then `request.url`. Without this fix the
 * redirect lands the user on an unreachable localhost URL.
 */
function publicOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const origin = publicOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code or exchange failed: back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
