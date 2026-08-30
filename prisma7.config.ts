import { config } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7). The datasource URL lives here rather than
 * in schema.prisma, which v7 no longer allows.
 *
 * Prisma does not read .env files on its own, so we load them in Next.js's
 * precedence order: .env.local wins over .env, and a variable already present in
 * the real environment (CI, Docker) wins over both - dotenv never overwrites.
 */
for (const path of [".env.local", ".env"]) {
  config({ path, quiet: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
