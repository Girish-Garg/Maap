import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/server/access";
import { getObject } from "@/lib/server/object-storage";

/**
 * Serves the signed-in user's business logo.
 *
 * The bucket is shared with other projects and stays private, so nothing links
 * to it directly - the bytes come through here instead. Only the owner can
 * fetch their own logo: the key is resolved from the session, never from the
 * request, so there is no id to tamper with and no way to enumerate anyone
 * else's file.
 *
 * The PDF export and the Settings preview both load this from the browser,
 * where the session cookie rides along on a same-origin request.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { user_id: userId },
    select: { logo_key: true },
  });
  if (!profile?.logo_key) {
    return NextResponse.json({ error: "No logo set." }, { status: 404 });
  }

  const object = await getObject(profile.logo_key);
  if (!object) {
    // The row points at an object that is gone - report it rather than
    // pretending, so a broken logo is visible instead of silently blank.
    console.error("[logo] missing object for key", profile.logo_key);
    return NextResponse.json({ error: "Logo file is missing." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.byteLength),
      // Private: this is one user's image, and the URL is versioned on upload.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
