import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The Prisma client, shared process-wide.
 *
 * Next.js reloads modules on every edit in development, so a plain
 * `new PrismaClient()` would open a fresh connection pool per reload until
 * Postgres refuses new connections. Caching it on globalThis keeps a single
 * pool across reloads; production builds create it once anyway.
 *
 * Construction is deferred until the first query. `next build` imports every
 * route to collect its metadata, and the image is built without database
 * credentials - connecting at import time would fail the build. Deferring also
 * means a missing DATABASE_URL surfaces at the call site with the message
 * below, rather than crashing the whole module graph (the same reasoning as
 * lib/env.ts).
 *
 * Importing "server-only" makes an accidental import from a Client Component a
 * build error rather than a runtime leak of database credentials.
 */

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Missing environment variable DATABASE_URL. " +
        "Local dev: copy .env.example to .env, then `docker compose up -d postgres`. " +
        "Production: set it in the VPS .env next to docker-compose.prod.yml, " +
        "pointing at the shared Postgres container (e.g. " +
        "postgresql://maap:<password>@shared-postgres:5432/maap).",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    // Surface slow/failed queries in the server log instead of swallowing them.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const created = createPrismaClient();
    // In production the module is evaluated once, so the local binding would do;
    // caching it anyway keeps a single code path.
    globalForPrisma.prisma = created;
  }
  return globalForPrisma.prisma;
}

/**
 * Stands in for the client until something actually touches it, at which point
 * the real one is created and every access forwards to it.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = client();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
