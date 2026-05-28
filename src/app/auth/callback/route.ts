import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Supabase appends a `code` to the redirect URL; we
 * exchange it for a session (cookies set via the server client) and send the
 * user to their intended destination, defaulting to the project list.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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
