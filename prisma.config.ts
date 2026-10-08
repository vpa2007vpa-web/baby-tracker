import { existsSync, readFileSync } from "node:fs";

import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer reads .env by itself. Node's built-in loader avoids a
// dotenv dependency; it is skipped when the file is absent (CI/deploy inject
// the variables directly) and never overrides variables already set.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  // Required by `migrations.initShadowDb`; no external tables are declared.
  experimental: { externalTables: true },
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // react-server condition: lets the seed import `server-only` modules (db, env).
    seed: "tsx --conditions=react-server prisma/seed.ts",
    // The shadow database lacks the objects of supabase-bootstrap.sql; these
    // no-op stubs let the migrations that reference them replay there.
    initShadowDb: readFileSync("prisma/platform/shadow-stubs.sql", "utf8"),
  },
  datasource: {
    // CLI only (migrate, studio): session pooler / direct connection on :5432.
    // The app uses DATABASE_URL (:6543) through PrismaPg in src/lib/db.ts.
    url: env("DIRECT_URL"),
  },
});
