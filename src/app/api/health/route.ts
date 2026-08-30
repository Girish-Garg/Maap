import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Liveness/readiness probe for the container healthcheck. It round-trips a
 * query so a running server that can't reach Postgres reports unhealthy rather
 * than serving errors on every page.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      status: "healthy",
      service: "Maap",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] database check failed:", error);

    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        service: "Maap",
        database: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
