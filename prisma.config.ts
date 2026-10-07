import { existsSync } from "node:fs";

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
    // The shadow database is a plain PostgreSQL database without the objects
    // created by prisma/platform/supabase-bootstrap.sql. These no-op stubs let
    // migrations that reference them replay there.
    initShadowDb: `
      CREATE SCHEMA IF NOT EXISTS private;
      CREATE OR REPLACE FUNCTION private.auth_uid() RETURNS uuid
        LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
      CREATE OR REPLACE FUNCTION private.add_table_to_realtime(target regclass) RETURNS void
        LANGUAGE plpgsql AS 'BEGIN END';
    `,
  },
  datasource: {
    // CLI only (migrate, studio): session pooler / direct connection on :5432.
    // The app uses DATABASE_URL (:6543) through PrismaPg in src/lib/db.ts.
    url: env("DIRECT_URL"),
  },
});
